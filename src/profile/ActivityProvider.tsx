import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { readWithRetries } from '@/lib/readRetry';
import { isoDate } from '@/profile/insights';
import type { ActivityDay } from '@/profile/insights';

const STORAGE_KEY = 'promptheart/activity';
/** About a year and a month: enough for the profile's year graph. */
const KEEP_DAYS = 400;

// A small log of copies per day, and which AI app each "Copy & open" went to. It stays on this phone
// and feeds the profile's activity graph, streaks and "Where your prompts go".
type ActivityContext = {
  days: Record<string, ActivityDay>;
  /** `at` is when the copy happened, for copies made from the widget while the app was closed. */
  logCopy: (appKey?: string, at?: number) => void;
  clear: () => void;
};

const Ctx = createContext<ActivityContext | null>(null);

const trim = (days: Record<string, ActivityDay>) => {
  const keys = Object.keys(days).sort();
  if (keys.length <= KEEP_DAYS) return days;
  return Object.fromEntries(keys.slice(-KEEP_DAYS).map((k) => [k, days[k]]));
};

/** Adds the days counted before the saved history finished loading, instead of replacing those days. */
function addDays(saved: Record<string, ActivityDay>, counted: Record<string, ActivityDay>) {
  const all = { ...saved };
  for (const [date, day] of Object.entries(counted)) {
    const before = all[date];
    if (!before) {
      all[date] = day;
      continue;
    }
    const opens = { ...before.opens };
    for (const [key, n] of Object.entries(day.opens)) opens[key] = (opens[key] ?? 0) + n;
    all[date] = { copies: before.copies + day.copies, opens };
  }
  return all;
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [days, setDays] = useState<Record<string, ActivityDay>>({});
  const loaded = useRef(false);

  useEffect(() => {
    readWithRetries(() => AsyncStorage.getItem(STORAGE_KEY)).then(
      (raw) => {
        if (loaded.current) return; // cleared while this was loading
        try {
          const saved = raw ? (JSON.parse(raw) as Record<string, ActivityDay> | null) : null;
          if (saved) setDays((now) => addDays(saved, now));
        } catch {
          // Unreadable: start from what was counted since the app opened.
        }
        loaded.current = true;
        // A new object, so copies counted while this loaded get saved even if nothing was stored yet.
        setDays((d) => ({ ...d }));
      },
      // The phone couldn't read the saved log. Copies still count for now, but nothing is saved, so the
      // saved year of activity isn't replaced by today's few.
      () => {},
    );
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(days)).catch(() => {});
  }, [days]);

  const logCopy = useCallback((appKey?: string, at: number = Date.now()) => {
    const date = isoDate(new Date(at));
    setDays((d) => {
      const day = d[date] ?? { copies: 0, opens: {} };
      const opens = appKey ? { ...day.opens, [appKey]: (day.opens[appKey] ?? 0) + 1 } : day.opens;
      return trim({ ...d, [date]: { copies: day.copies + 1, opens } });
    });
  }, []);

  // Clearing saves the empty log even if the saved one couldn't be read, since removing it is the point.
  const clear = useCallback(() => {
    loaded.current = true;
    setDays({});
  }, []);

  const value = useMemo(() => ({ days, logCopy, clear }), [days, logCopy, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActivity() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useActivity must be used inside ActivityProvider');
  return ctx;
}
