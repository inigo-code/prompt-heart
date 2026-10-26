import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { IMAGE_BUCKET, deleteRemoteImages, downloadMissingImages, imagesSupported, uploadImage } from '@/lib/images';
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

export type SyncProgress = { label: string; done: number; total: number };

type SyncContext = {
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: number | null;
  email: string | null;
  pendingCount: number;
  /** Bumps when images finish downloading, so thumbnails can re-check for their files. */
  imagesVersion: number;
  /** Resolves when the sync finishes (for pull-to-refresh). */
  syncNow: () => Promise<void>;
  /** Image transfer in progress, e.g. { label: "Uploading images", done: 2, total: 5 }. */
  progress: SyncProgress | null;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves to true when signed in straight away, false if Supabase wants the email confirmed first. */
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Signed-in user, with the profile fields saved on the account (name, photo version). */
  user: { id: string; email: string | null; meta: Record<string, unknown> } | null;
  /** Saves fields on the account (merged into what's there). */
  updateProfile: (data: Record<string, unknown>) => Promise<void>;
  /** 'changed' when it applies at once, 'confirm' when Supabase emails links to confirm first. */
  updateEmail: (email: string) => Promise<'changed' | 'confirm'>;
  updatePassword: (password: string) => Promise<void>;
  /** Deletes the account, its prompts and its files from the cloud, then signs out. */
  deleteAccount: () => Promise<void>;
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

/** Uploads new attachments before the prompt rows that reference them, and removes deleted ones. */
type OnProgress = (p: SyncProgress | null) => void;

async function pushImages(client: SupabaseClient, userId: string, store: SyncStoreApi, onProgress: OnProgress) {
  if (!imagesSupported) return;
  const { pendingImageUploads, pendingImageDeletes } = store.getSnapshot().sync;
  const uploaded: string[] = [];
  for (const [i, id] of pendingImageUploads.entries()) {
    onProgress({ label: 'Uploading images', done: i, total: pendingImageUploads.length });
    // A missing file can't be uploaded from here (another device has it); drop it from the queue.
    await uploadImage(client, userId, id);
    uploaded.push(id);
  }
  await deleteRemoteImages(client, userId, pendingImageDeletes);
  store.markImagesSynced({ uploaded, deleted: pendingImageDeletes });
}

/** Fetches attachments referenced by prompts that this device doesn't have a file for yet. */
async function pullImages(client: SupabaseClient, userId: string, store: SyncStoreApi, onProgress: OnProgress): Promise<number> {
  if (!imagesSupported) return 0;
  const ids = [...new Set(store.getSnapshot().prompts.filter((p) => p.deletedAt === null || p.body || p.title).flatMap((p) => p.images))];
  return downloadMissingImages(client, userId, ids, (done, total) => onProgress({ label: 'Downloading images', done, total }));
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
  const { meta, localRevision, resetForUser, forgetAccount } = store;
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<{ status: 'idle' | 'syncing' | 'synced' | 'error'; error: string | null; lastSyncedAt: number | null }>({
    status: 'idle',
    error: null,
    lastSyncedAt: null,
  });

  const [imagesVersion, setImagesVersion] = useState(0);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
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
        await pushImages(supabase, userId, storeRef.current, setProgress);
        setProgress(null);
        await push(supabase, userId, storeRef.current);
        await pull(supabase, userId, storeRef.current);
        if ((await pullImages(supabase, userId, storeRef.current, setProgress)) > 0) setImagesVersion((v) => v + 1);
        setProgress(null);
      } while (again.current);
      setState({ status: 'synced', error: null, lastSyncedAt: Date.now() });
    } catch (e) {
      const message = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
      setProgress(null);
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

  const updateProfile = useCallback(async (data: Record<string, unknown>) => {
    if (!supabase) throw new Error('Cloud sync is not configured.');
    const { error } = await supabase.auth.updateUser({ data });
    if (error) throw error;
  }, []);

  const updateEmail = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Cloud sync is not configured.');
    const next = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.updateUser({ email: next });
    if (error) throw error;
    return data.user?.email?.toLowerCase() === next ? 'changed' : 'confirm';
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Cloud sync is not configured.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!supabase || !userId) throw new Error('Sign in first.');
    const client = supabase;
    // Storage files aren't removed by the database cascade, so delete everything in the user's folder first.
    for (;;) {
      const { data: files, error } = await client.storage.from(IMAGE_BUCKET).list(userId, { limit: 100 });
      if (error) throw error;
      if (!files || files.length === 0) break;
      const { error: rmError } = await client.storage.from(IMAGE_BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
      if (rmError) throw rmError;
      if (files.length < 100) break;
    }
    const { error } = await client.rpc('delete_my_account');
    if (error) {
      throw new Error(
        /delete_my_account/.test(error.message)
          ? "Account deletion isn't set up on the server yet (run supabase/delete_my_account.sql)."
          : error.message,
      );
    }
    await client.auth.signOut({ scope: 'local' }).catch(() => {});
    forgetAccount();
    setState({ status: 'idle', error: null, lastSyncedAt: null });
  }, [userId, forgetAccount]);

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
      user: session ? { id: session.user.id, email: session.user.email ?? null, meta: session.user.user_metadata ?? {} } : null,
      updateProfile,
      updateEmail,
      updatePassword,
      deleteAccount,
      pendingCount: meta.pendingPrompts.length + meta.pendingFolders.length + meta.pendingImageUploads.length,
      imagesVersion,
      syncNow: runSync,
      progress,
      signIn,
      signUp,
      signOut,
    }),
    [userId, session, state, meta, imagesVersion, progress, runSync, signIn, signUp, signOut, updateProfile, updateEmail, updatePassword, deleteAccount],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
}
