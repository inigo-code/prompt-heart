import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { usePromptStore } from '@/store/PromptStore';
import type { SyncStoreApi } from '@/store/PromptStore';
import { folderToRow, promptToRow, rowToFolder, rowToPrompt } from './rows';
import type { FolderRow, PromptRow } from './rows';
import { supabase } from './supabase';

const PAGE = 1000;
const LOCAL_DEBOUNCE_MS = 1500;
const RETRY_MS = 30_000;
// Pull a little before the last cursor: rows committed by slower transactions can carry slightly
// older server timestamps. Merging is idempotent, so re-reading a few rows is harmless.
const PULL_OVERLAP_MS = 10_000;

export type SyncStatus = 'unconfigured' | 'signed-out' | 'idle' | 'syncing' | 'synced' | 'error';

type SyncContext = {
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: number | null;
  email: string | null;
  pendingCount: number;
  syncNow: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves to true when signed in straight away, false if Supabase wants the email confirmed first. */
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SyncContext | null>(null);

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function push(client: SupabaseClient, userId: string, store: SyncStoreApi) {
  const d = store.getSnapshot();
  const pf = new Set(d.sync.pendingFolders);
  const pp = new Set(d.sync.pendingPrompts);
  const folders = d.folders.filter((f) => pf.has(f.id));
  const prompts = d.prompts.filter((p) => pp.has(p.id));
  if (folders.length === 0 && prompts.length === 0 && pf.size === 0 && pp.size === 0) return;

  for (const rows of chunks(folders.map((f) => folderToRow(f, userId)), 500)) {
    const { error } = await client.from('folders').upsert(rows, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
  for (const rows of chunks(prompts.map((p) => promptToRow(p, userId)), 500)) {
    const { error } = await client.from('prompts').upsert(rows, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
  store.markPushed({
    folders: Object.fromEntries(folders.map((f) => [f.id, f.modifiedAt])),
    prompts: Object.fromEntries(prompts.map((p) => [p.id, p.modifiedAt])),
  });
}

async function pullTable<R extends { server_updated_at?: string }>(
  client: SupabaseClient,
  table: 'folders' | 'prompts',
  userId: string,
  since: string | null,
): Promise<R[]> {
  const out: R[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = client.from(table).select('*').eq('user_id', userId);
    if (since) q = q.gt('server_updated_at', since);
    const { data, error } = await q.order('server_updated_at').order('id').range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data as R[]));
    if (data.length < PAGE) return out;
  }
}

async function pull(client: SupabaseClient, userId: string, store: SyncStoreApi) {
  const cursor = store.getSnapshot().sync.lastPulledAt;
  const since = cursor ? new Date(Date.parse(cursor) - PULL_OVERLAP_MS).toISOString() : null;
  const [folderRows, promptRows] = await Promise.all([
    pullTable<FolderRow>(client, 'folders', userId, since),
    pullTable<PromptRow>(client, 'prompts', userId, since),
  ]);

  let newest = cursor;
  for (const r of [...folderRows, ...promptRows]) {
    if (r.server_updated_at && (!newest || Date.parse(r.server_updated_at) > Date.parse(newest))) newest = r.server_updated_at;
  }
  store.applyRemote({ folders: folderRows.map(rowToFolder), prompts: promptRows.map(rowToPrompt) }, newest);
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { ready, sync: store } = usePromptStore();
  const { meta, localRevision, resetForUser } = store;
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<{ status: 'idle' | 'syncing' | 'synced' | 'error'; error: string | null; lastSyncedAt: number | null }>({
    status: 'idle',
    error: null,
    lastSyncedAt: null,
  });

  const userId = session?.user.id ?? null;
  // Sync only once the store has been switched over to this account.
  const active = ready && userId !== null && meta.userId === userId;

  const storeRef = useRef(store);
  useEffect(() => {
    storeRef.current = store;
  });
  const running = useRef(false);
  const again = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (ready && userId && meta.userId !== userId) resetForUser(userId);
  }, [ready, userId, meta.userId, resetForUser]);

  const runSync = useCallback(async () => {
    if (!supabase || !userId) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setState((s) => ({ ...s, status: 'syncing' }));
    try {
      do {
        again.current = false;
        await push(supabase, userId, storeRef.current);
        await pull(supabase, userId, storeRef.current);
      } while (again.current);
      setState({ status: 'synced', error: null, lastSyncedAt: Date.now() });
    } catch (e) {
      const message = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      setState((s) => ({ ...s, status: 'error', error: message }));
    } finally {
      running.current = false;
    }
  }, [userId]);

  // On sign-in, and shortly after each local edit.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => void runSync(), localRevision === 0 ? 0 : LOCAL_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [active, localRevision, runSync]);

  // When the app comes back to the foreground.
  useEffect(() => {
    if (!active) return;
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void runSync());
    return () => sub.remove();
  }, [active, runSync]);

  // Live updates from other devices.
  useEffect(() => {
    if (!active || !supabase || !userId) return;
    const client = supabase;
    let t: ReturnType<typeof setTimeout> | null = null;
    const onChange = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void runSync(), 400);
    };
    const channel = client
      .channel(`sync-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prompts', filter: `user_id=eq.${userId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders', filter: `user_id=eq.${userId}` }, onChange)
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      client.removeChannel(channel);
    };
  }, [active, userId, runSync]);

  // Retry after a failure (offline, server hiccup).
  useEffect(() => {
    if (!active || state.status !== 'error') return;
    const t = setTimeout(() => void runSync(), RETRY_MS);
    return () => clearTimeout(t);
  }, [active, state.status, runSync]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Cloud sync is not configured.');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Cloud sync is not configured.');
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    return data.session !== null;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setState({ status: 'idle', error: null, lastSyncedAt: null });
  }, []);

  const value = useMemo<SyncContext>(
    () => ({
      status: !supabase ? 'unconfigured' : !userId ? 'signed-out' : state.status,
      error: state.error,
      lastSyncedAt: state.lastSyncedAt,
      email: session?.user.email ?? null,
      pendingCount: meta.pendingPrompts.length + meta.pendingFolders.length,
      syncNow: () => void runSync(),
      signIn,
      signUp,
      signOut,
    }),
    [userId, session, state, meta, runSync, signIn, signUp, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
}
