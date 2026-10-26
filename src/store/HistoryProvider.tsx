import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { usePromptStore } from './PromptStore';

// Earlier versions of each prompt's text, kept on this device (not synced, to keep sync light).
const STORAGE_KEY = 'promptheart/history';
const MAX_VERSIONS = 25;

export type Version = { at: number; title: string; body: string };
type History = Record<string, Version[]>;

type HistoryContext = {
  /** Newest first. */
  versionsFor: (promptId: string) => Version[];
  /** Saves the prompt's current text as a version, unless it matches the newest one. */
  snapshot: (promptId: string) => void;
  /** Saves the current text as a version, then puts the old version back. */
  restore: (promptId: string, version: Version) => void;
  forget: (promptId: string) => void;
  /** Removes all history on this device (used when signing out and erasing). */
  clearAll: () => void;
};

const Ctx = createContext<HistoryContext | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const store = usePromptStore();
  const [history, setHistory] = useState<History>({});
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setHistory(JSON.parse(raw) as History))
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history)).catch(() => {}), 400);
    return () => clearTimeout(t);
  }, [history]);

  const getSnapshot = store.sync.getSnapshot;
  const updatePrompt = store.updatePrompt;

  const snapshot = useCallback(
    (promptId: string) => {
      const p = getSnapshot().prompts.find((x) => x.id === promptId);
      if (!p || (!p.title && !p.body)) return;
      setHistory((h) => {
        const list = h[promptId] ?? [];
        const latest = list[0];
        if (latest && latest.title === p.title && latest.body === p.body) return h;
        return { ...h, [promptId]: [{ at: p.updatedAt, title: p.title, body: p.body }, ...list].slice(0, MAX_VERSIONS) };
      });
    },
    [getSnapshot],
  );

  const restore = useCallback(
    (promptId: string, version: Version) => {
      snapshot(promptId);
      updatePrompt(promptId, { title: version.title, body: version.body });
    },
    [snapshot, updatePrompt],
  );

  const forget = useCallback((promptId: string) => {
    setHistory((h) => {
      if (!(promptId in h)) return h;
      const next = { ...h };
      delete next[promptId];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setHistory({}), []);

  const value = useMemo<HistoryContext>(
    () => ({ versionsFor: (id) => history[id] ?? [], snapshot, restore, forget, clearAll }),
    [history, snapshot, restore, forget, clearAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHistory() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useHistory must be used inside HistoryProvider');
  return ctx;
}
