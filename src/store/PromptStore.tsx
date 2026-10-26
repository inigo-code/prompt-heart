import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { clearPending, mergeRecords, migrate } from './merge';
import { seedData } from './seed';
import type { Folder, Prompt, PromptDraft, StoreData, SyncMeta } from './types';

const STORAGE_KEY = 'prompt-notes/v1';

export const FOLDER_COLORS = ['#F2B84B', '#5B8DEF', '#4CB782', '#E5688A', '#9B7BE0', '#EE8B4A', '#3FB6C4', '#8A8F98'];

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizeTag = (tag: string) => tag.trim().replace(/^#+/, '').toLowerCase().replace(/\s+/g, '-');

const addIds = (list: string[], ids: string[]) => (ids.length ? [...new Set([...list, ...ids])] : list);

/** Applies a local change and marks the touched records as waiting to sync. */
function local(d: StoreData, next: Pick<StoreData, 'prompts' | 'folders'>, promptIds: string[], folderIds: string[] = []): StoreData {
  return {
    ...d,
    ...next,
    sync: {
      ...d.sync,
      pendingPrompts: addIds(d.sync.pendingPrompts, promptIds),
      pendingFolders: addIds(d.sync.pendingFolders, folderIds),
    },
  };
}

type PromptStore = {
  ready: boolean;
  prompts: Prompt[];
  folders: Folder[];
  allTags: string[];
  getPrompt: (id: string) => Prompt | undefined;
  getFolder: (id: string | null) => Folder | undefined;
  createPrompt: (draft: PromptDraft) => Prompt;
  updatePrompt: (id: string, patch: Partial<PromptDraft>) => void;
  deletePrompt: (id: string) => void;
  duplicatePrompt: (id: string) => Prompt | undefined;
  togglePin: (id: string) => void;
  recordCopy: (id: string) => void;
  createFolder: (name: string, color?: string) => Folder;
  updateFolder: (id: string, patch: Partial<Pick<Folder, 'name' | 'color'>>) => void;
  deleteFolder: (id: string) => void;
  sync: SyncStoreApi;
};

/** What the sync engine needs; screens shouldn't use this. */
export type SyncStoreApi = {
  meta: SyncMeta;
  localRevision: number;
  /** Latest data, including soft-deleted records. Safe to call from async code. */
  getSnapshot: () => StoreData;
  applyRemote: (remote: { prompts: Prompt[]; folders: Folder[] }, lastPulledAt: string | null) => void;
  markPushed: (sent: { prompts: Record<string, number>; folders: Record<string, number> }) => void;
  /** Starts syncing with a new account: everything on this device gets uploaded. */
  resetForUser: (userId: string) => void;
};

const Ctx = createContext<PromptStore | null>(null);

export function PromptStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(seedData);
  const [ready, setReady] = useState(false);
  // Bumped on every local edit (not on merges from the server), so sync knows when to upload.
  const [localRevision, setLocalRevision] = useState(0);
  const loaded = useRef(false);
  const snapshot = useRef(data);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setData(raw ? migrate(JSON.parse(raw)) : seedData))
      .catch(() => setData(seedData))
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  // Layout effect so the snapshot is current before any child's effects (the sync engine) run.
  useLayoutEffect(() => {
    snapshot.current = data;
  }, [data]);

  // Persist shortly after changes settle (the editor saves on every keystroke),
  // and never overwrite storage before the first load finishes.
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [data]);

  const commitLocal = useCallback((fn: (d: StoreData) => StoreData) => {
    setData(fn);
    setLocalRevision((r) => r + 1);
  }, []);

  const mutatePrompt = useCallback((id: string, fn: (p: Prompt) => Partial<Prompt>) => {
    commitLocal((d) =>
      local(d, { folders: d.folders, prompts: d.prompts.map((p) => (p.id === id ? { ...p, ...fn(p), modifiedAt: Date.now() } : p)) }, [id]),
    );
  }, [commitLocal]);

  const createPrompt = useCallback((draft: PromptDraft) => {
    const now = Date.now();
    const prompt: Prompt = {
      ...draft,
      id: newId(),
      copyCount: 0,
      createdAt: now,
      updatedAt: now,
      lastCopiedAt: null,
      modifiedAt: now,
      deletedAt: null,
    };
    commitLocal((d) => local(d, { folders: d.folders, prompts: [prompt, ...d.prompts] }, [prompt.id]));
    return prompt;
  }, [commitLocal]);

  const updatePrompt = useCallback(
    (id: string, patch: Partial<PromptDraft>) => mutatePrompt(id, () => ({ ...patch, updatedAt: Date.now() })),
    [mutatePrompt],
  );

  const deletePrompt = useCallback((id: string) => mutatePrompt(id, () => ({ deletedAt: Date.now() })), [mutatePrompt]);

  const togglePin = useCallback((id: string) => mutatePrompt(id, (p) => ({ pinned: !p.pinned })), [mutatePrompt]);

  const recordCopy = useCallback(
    (id: string) => mutatePrompt(id, (p) => ({ copyCount: p.copyCount + 1, lastCopiedAt: Date.now() })),
    [mutatePrompt],
  );

  const createFolder = useCallback((name: string, color?: string) => {
    const now = Date.now();
    const folder: Folder = {
      id: newId(),
      name: name.trim(),
      color: color ?? FOLDER_COLORS[0],
      createdAt: now,
      modifiedAt: now,
      deletedAt: null,
    };
    commitLocal((d) => local(d, { prompts: d.prompts, folders: [...d.folders, folder] }, [], [folder.id]));
    return folder;
  }, [commitLocal]);

  const updateFolder = useCallback((id: string, patch: Partial<Pick<Folder, 'name' | 'color'>>) => {
    commitLocal((d) =>
      local(d, { prompts: d.prompts, folders: d.folders.map((f) => (f.id === id ? { ...f, ...patch, modifiedAt: Date.now() } : f)) }, [], [id]),
    );
  }, [commitLocal]);

  // Deleting a category keeps its prompts; they become uncategorised.
  const deleteFolder = useCallback((id: string) => {
    commitLocal((d) => {
      const now = Date.now();
      const moved = d.prompts.filter((p) => p.folderId === id).map((p) => p.id);
      return local(
        d,
        {
          folders: d.folders.map((f) => (f.id === id ? { ...f, deletedAt: now, modifiedAt: now } : f)),
          prompts: d.prompts.map((p) => (p.folderId === id ? { ...p, folderId: null, modifiedAt: now } : p)),
        },
        moved,
        [id],
      );
    });
  }, [commitLocal]);

  const getSnapshot = useCallback(() => snapshot.current, []);

  const applyRemote = useCallback<SyncStoreApi['applyRemote']>((remote, lastPulledAt) => {
    setData((d) =>
      remote.prompts.length === 0 && remote.folders.length === 0 && lastPulledAt === d.sync.lastPulledAt
        ? d
        : {
            ...d,
            prompts: mergeRecords(d.prompts, remote.prompts),
            folders: mergeRecords(d.folders, remote.folders),
            sync: { ...d.sync, lastPulledAt },
          },
    );
  }, []);

  const markPushed = useCallback<SyncStoreApi['markPushed']>((sent) => {
    setData((d) => ({
      ...d,
      sync: {
        ...d.sync,
        pendingPrompts: clearPending(d.sync.pendingPrompts, d.prompts, sent.prompts),
        pendingFolders: clearPending(d.sync.pendingFolders, d.folders, sent.folders),
      },
    }));
  }, []);

  const resetForUser = useCallback((userId: string) => {
    setData((d) => ({
      ...d,
      sync: {
        userId,
        lastPulledAt: null,
        pendingPrompts: d.prompts.map((p) => p.id),
        pendingFolders: d.folders.map((f) => f.id),
      },
    }));
  }, []);

  const sync = useMemo<SyncStoreApi>(
    () => ({ meta: data.sync, localRevision, getSnapshot, applyRemote, markPushed, resetForUser }),
    [data.sync, localRevision, getSnapshot, applyRemote, markPushed, resetForUser],
  );

  const value = useMemo<PromptStore>(() => {
    const prompts = data.prompts.filter((p) => p.deletedAt === null);
    const folders = data.folders.filter((f) => f.deletedAt === null);
    const getPrompt = (id: string) => prompts.find((p) => p.id === id);
    const allTags = [...new Set(prompts.flatMap((p) => p.tags))].sort();
    return {
      ready,
      prompts,
      folders,
      allTags,
      getPrompt,
      getFolder: (id) => (id ? folders.find((f) => f.id === id) : undefined),
      createPrompt,
      updatePrompt,
      deletePrompt,
      duplicatePrompt: (id) => {
        const src = getPrompt(id);
        if (!src) return undefined;
        return createPrompt({ title: `${src.title} (copy)`, body: src.body, folderId: src.folderId, tags: src.tags, pinned: false });
      },
      togglePin,
      recordCopy,
      createFolder,
      updateFolder,
      deleteFolder,
      sync,
    };
  }, [data, ready, createPrompt, updatePrompt, deletePrompt, togglePin, recordCopy, createFolder, updateFolder, deleteFolder, sync]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePromptStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePromptStore must be used inside PromptStoreProvider');
  return ctx;
}
