import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { readWithRetries } from '@/lib/readRetry';

import { usePromptStore } from './PromptStore';
import { MAX_VERSIONS, mergeHistory, parseHistory, pruneHistory } from './versions';
import type { History, Version } from './versions';

export type { Version };

// Earlier versions of each prompt's text, kept on this device (not synced, to keep sync light).
const STORAGE_KEY = 'promptheart/history';

type HistoryContext = {
  /** Every prompt's versions (for the profile's activity). */
  all: History;
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readWithRetries(() => AsyncStorage.getItem(STORAGE_KEY)).then(
      (raw) => {
        if (loaded.current) return; // erased while this was loading
        // Versions kept in the moments before this loaded are added, not lost.
        const saved = parseHistory(raw);
        setHistory((now) => mergeHistory(saved, now));
        loaded.current = true;
        setReady(true);
      },
      // The phone couldn't read the saved history. New versions still show for now, but nothing is saved,
      // so the saved history isn't replaced by this session's few.
      () => {},
    );
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history)).catch(() => {}), 400);
    return () => clearTimeout(t);
  }, [history]);

  const getSnapshot = store.sync.getSnapshot;
  const updatePrompt = store.updatePrompt;
  const { ready: storeReady, pruneSafe, prompts, trash } = store;

  // A prompt deleted for good (Empty Trash, after its time in Trash, or on another device) takes its old
  // versions with it, so its text doesn't stay on the phone. Prompts in Trash keep theirs.
  useEffect(() => {
    if (!storeReady || !pruneSafe || !ready) return;
    const known = new Set([...prompts, ...trash].map((p) => p.id));
    // Async, as it reacts to a change in the prompt store (like the profile's reaction to the account).
    void Promise.resolve().then(() => setHistory((h) => pruneHistory(h, (id) => known.has(id))));
  }, [storeReady, pruneSafe, ready, prompts, trash]);

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

  // Erasing saves the empty history even if the saved one couldn't be read, since removing it is the point.
  const clearAll = useCallback(() => {
    loaded.current = true;
    setReady(true);
    setHistory({});
  }, []);

  const value = useMemo<HistoryContext>(
    () => ({ all: history, versionsFor: (id) => history[id] ?? [], snapshot, restore, forget, clearAll }),
    [history, snapshot, restore, forget, clearAll],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHistory() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useHistory must be used inside HistoryProvider');
  return ctx;
}
