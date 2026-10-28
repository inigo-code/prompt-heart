import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { isoDate } from '@/profile/insights';
import type { ActivityDay } from '@/profile/insights';

const STORAGE_KEY = 'promptheart/activity';
/** About a year and a month: enough for the profile's year graph. */
const KEEP_DAYS = 400;

// A small log of copies per day, and which AI app each "Copy & open" went to. It stays on this phone
// and feeds the profile's activity graph, streaks and "Where your prompts go".
type ActivityContext = {
  days: Record<string, ActivityDay>;
  logCopy: (appKey?: string) => void;
  clear: () => void;
};

const Ctx = createContext<ActivityContext | null>(null);

const trim = (days: Record<string, ActivityDay>) => {
  const keys = Object.keys(days).sort();
  if (keys.length <= KEEP_DAYS) return days;
  return Object.fromEntries(keys.slice(-KEEP_DAYS).map((k) => [k, days[k]]));
};

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [days, setDays] = useState<Record<string, ActivityDay>>({});
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setDays((now) => ({ ...(JSON.parse(raw) as Record<string, ActivityDay>), ...now })))
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(days)).catch(() => {});
  }, [days]);

  const logCopy = useCallback((appKey?: string) => {
    const today = isoDate(new Date());
    setDays((d) => {
      const day = d[today] ?? { copies: 0, opens: {} };
      const opens = appKey ? { ...day.opens, [appKey]: (day.opens[appKey] ?? 0) + 1 } : day.opens;
      return trim({ ...d, [today]: { copies: day.copies + 1, opens } });
    });
  }, []);

  const clear = useCallback(() => setDays({}), []);

  const value = useMemo(() => ({ days, logCopy, clear }), [days, logCopy, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActivity() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useActivity must be used inside ActivityProvider');
  return ctx;
}
