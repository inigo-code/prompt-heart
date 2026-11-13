import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { newId } from '@/lib/id';
import { deleteLocalImage } from '@/lib/images';
import { readWithRetries } from '@/lib/readRetry';
import { PROMPTS_STORAGE_KEY } from '@/lib/storageKeys';

import { clearPending, emptySyncMeta, mergeBackup, mergePrompts, mergeRecords, migrate, promptVersion } from './merge';
import type { ImportResult } from './merge';
import { seedData } from './seed';
import type { Folder, Prompt, PromptDraft, StoreData, SyncMeta } from './types';

// Kept from the app's first name so existing installs keep their data.
/** The home-screen widget reads prompts straight from here. */
const STORAGE_KEY = PROMPTS_STORAGE_KEY;
const UNREADABLE_KEY = 'prompt-notes/unreadable';

/** Deleted prompts stay in Trash this long before they're hidden for good. */
export const TRASH_DAYS = 30;

export const FOLDER_COLORS = ['#F2B84B', '#5B8DEF', '#4CB782', '#E5688A', '#9B7BE0', '#EE8B4A', '#3FB6C4', '#8A8F98'];

export { newId };

export const normalizeTag = (tag: string) => tag.trim().replace(/^#+/, '').toLowerCase().replace(/\s+/g, '-');

const addIds = (list: string[], ids: string[]) => (ids.length ? [...new Set([...list, ...ids])] : list);
const removeIds = (list: string[], ids: string[]) => (ids.length ? list.filter((id) => !ids.includes(id)) : list);

/** Applies a local change and marks the touched records as waiting to sync. */
function local(
  d: StoreData,
  next: Pick<StoreData, 'prompts' | 'folders'>,
  promptIds: string[],
  folderIds: string[] = [],
  images: { upload?: string[]; remove?: string[] } = {},
): StoreData {
  return {
    ...d,
    ...next,
    sync: {
      ...d.sync,
      pendingPrompts: addIds(d.sync.pendingPrompts, promptIds),
      pendingFolders: addIds(d.sync.pendingFolders, folderIds),
      pendingImageUploads: removeIds(addIds(d.sync.pendingImageUploads, images.upload ?? []), images.remove ?? []),
      pendingImageDeletes: removeIds(addIds(d.sync.pendingImageDeletes, images.remove ?? []), images.upload ?? []),
    },
  };
}

/** Image ids no longer referenced by any prompt that still has content (live or in Trash). */
function orphanedImages(prompts: Prompt[], candidates: string[]): string[] {
  const used = new Set(prompts.filter((p) => p.title || p.body).flatMap((p) => p.images));
  return candidates.filter((id) => !used.has(id));
}

const isPurged = (p: Prompt) => p.deletedAt !== null && !p.title && !p.body && p.images.length === 0;

type PromptStore = {
  /** False until saved prompts are read, and stays false while `loadFailed`. */
  ready: boolean;
  /** The phone couldn't read the saved prompts. Nothing is saved or synced until `retryLoad` works. */
  loadFailed: boolean;
  /** Reads the saved prompts again after a failed read. */
  retryLoad: () => Promise<void>;
  /** Goes up by one each time saving starts failing (not on every failed try), so the app can say so once. */
  saveFailures: number;
  /**
   * True once the prompts here are known to be the real ones, so data kept for other prompts (version
   * history, typed blanks) can be dropped. False while unreadable prompts are set aside, since the
   * samples standing in for them would make every real prompt look deleted.
   */
  pruneSafe: boolean;
  prompts: Prompt[];
  folders: Folder[];
  /** Deleted prompts from the last TRASH_DAYS days, newest first. */
  trash: Prompt[];
  allTags: string[];
  getPrompt: (id: string) => Prompt | undefined;
  getFolder: (id: string | null) => Folder | undefined;
  createPrompt: (draft: Partial<PromptDraft>) => Prompt;
  updatePrompt: (id: string, patch: Partial<PromptDraft>) => void;
  /** Adds images that are already saved in the local images folder. */
  attachImages: (id: string, imageIds: string[]) => void;
  /** Detaches an image; returns true when no other prompt uses it, so the caller can delete the file. */
  removeImage: (id: string, imageId: string) => boolean;
  deletePrompt: (id: string) => void;
  restorePrompt: (id: string) => void;
  /** Bulk actions for multi-select. */
  movePrompts: (ids: string[], folderId: string | null) => void;
  tagPrompts: (ids: string[], tag: string) => void;
  setPinned: (ids: string[], pinned: boolean) => void;
  deletePrompts: (ids: string[]) => void;
  restorePrompts: (ids: string[]) => void;
  /** Deletes for good: clears the content but keeps a tombstone so the delete syncs. Returns image ids to delete. */
  purgePrompt: (id: string) => string[];
  emptyTrash: () => string[];
  duplicatePrompt: (id: string) => Prompt | undefined;
  togglePin: (id: string) => void;
  /** `at` is when the copy happened, for copies made from the widget while the app was closed. */
  recordCopy: (id: string, at?: number) => void;
  createFolder: (name: string, color?: string) => Folder;
  updateFolder: (id: string, patch: Partial<Pick<Folder, 'name' | 'color'>>) => void;
  deleteFolder: (id: string) => void;
  /** Creates folders with fixed ids if this device has never had them (deleted ones stay deleted). */
  ensureFolders: (folders: Pick<Folder, 'id' | 'name' | 'color'>[]) => void;
  /** Removes every prompt and category from this device and starts over with the samples. Returns image ids to delete. */
  eraseAll: () => string[];
  /** Merges a backup; image ids in it must already be saved locally. */
  importBackup: (backup: { prompts: Prompt[]; folders: Folder[] }) => ImportResult;
  sync: SyncStoreApi;
};

/** What the sync engine needs; screens shouldn't use this. */
export type SyncStoreApi = {
  meta: SyncMeta;
  localRevision: number;
  /** Latest data, including soft-deleted records. Safe to call from async code. */
  getSnapshot: () => StoreData;
  applyRemote: (remote: { prompts: Prompt[]; folders: Folder[] }, lastPulledAt: string | null) => void;
  /** `prompts` maps ids to promptVersion() of what was sent; `folders` to modifiedAt. */
  markPushed: (sent: { prompts: Record<string, string>; folders: Record<string, number> }) => void;
  markImagesSynced: (done: { uploaded: string[]; deleted: string[] }) => void;
  /** Starts syncing with a new account: everything on this device gets uploaded. */
  resetForUser: (userId: string) => void;
  /** After the account is deleted: forget it, so a later sign-in starts a fresh upload. */
  forgetAccount: () => void;
};

const Ctx = createContext<PromptStore | null>(null);

export function PromptStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(seedData);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailures, setSaveFailures] = useState(0);
  const [pruneSafe, setPruneSafe] = useState(false);
  // Bumped on every local edit (not on merges from the server), so sync knows when to upload.
  const [localRevision, setLocalRevision] = useState(0);
  // Trash cutoff is computed from launch time; a 30-day window doesn't need to tick live.
  const [openedAt] = useState(() => Date.now());
  const loaded = useRef(false);
  const snapshot = useRef(data);

  const read = useCallback(
    () =>
      readWithRetries(() => AsyncStorage.getItem(STORAGE_KEY)).then(
        async (raw) => {
          try {
            setData(raw ? migrate(JSON.parse(raw)) : seedData);
            // Prompts set aside as unreadable on an earlier launch are still there: keep what belongs to them.
            setPruneSafe((await AsyncStorage.getItem(UNREADABLE_KEY).catch(() => 'unknown')) === null);
          } catch {
            // Unreadable: start from the samples, but keep the original so the next save can't destroy it.
            if (raw) await AsyncStorage.setItem(UNREADABLE_KEY, raw).catch(() => {});
            setData(seedData);
            setPruneSafe(false);
          }
          loaded.current = true;
          setLoadFailed(false);
          setReady(true);
        },
        // The phone couldn't read storage at all, so we don't know what's there. Saving now would put the
        // samples over the real prompts, so saving and sync stay off until a read works.
        () => setLoadFailed(true),
      ),
    [],
  );

  useEffect(() => {
    void read();
  }, [read]);

  // Layout effect so the snapshot is current before any child's effects (the sync engine) run.
  useLayoutEffect(() => {
    snapshot.current = data;
  }, [data]);

  const unsaved = useRef(false);
  const saveFailing = useRef(false);
  const save = useCallback(() => {
    unsaved.current = false;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.current)).then(
      () => {
        saveFailing.current = false;
      },
      () => {
        // Try again with the next change or when the app is left; say so once, not on every keystroke.
        unsaved.current = true;
        if (saveFailing.current) return;
        saveFailing.current = true;
        setSaveFailures((n) => n + 1);
      },
    );
  }, []);

  // Persist shortly after changes settle (the editor saves on every keystroke),
  // and never overwrite storage before the first load finishes.
  useEffect(() => {
    if (!loaded.current) return;
    unsaved.current = true;
    const t = setTimeout(save, 300);
    return () => clearTimeout(t);
  }, [data, save]);

  // Android can end the app any time after it leaves the screen, so don't leave the last edit on a timer.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && unsaved.current) save();
    });
    return () => sub.remove();
  }, [save]);

  const commitLocal = useCallback((fn: (d: StoreData) => StoreData) => {
    setData(fn);
    setLocalRevision((r) => r + 1);
  }, []);

  const mutatePrompt = useCallback(
    (id: string, fn: (p: Prompt) => Partial<Prompt>, images?: { upload?: string[]; remove?: string[] }) => {
      commitLocal((d) =>
        local(
          d,
          { folders: d.folders, prompts: d.prompts.map((p) => (p.id === id ? { ...p, ...fn(p), modifiedAt: Date.now() } : p)) },
          [id],
          [],
          images,
        ),
      );
    },
    [commitLocal],
  );

  const createPrompt = useCallback(
    (draft: Partial<PromptDraft>) => {
      const now = Date.now();
      const prompt: Prompt = {
        title: '',
        body: '',
        folderId: null,
        tags: [],
        pinned: false,
        images: [],
        ...draft,
        id: newId(),
        copyCount: 0,
        createdAt: now,
        updatedAt: now,
        lastCopiedAt: null,
        modifiedAt: now,
        deletedAt: null,
      };
      commitLocal((d) => local(d, { folders: d.folders, prompts: [prompt, ...d.prompts] }, [prompt.id], [], { upload: prompt.images }));
      return prompt;
    },
    [commitLocal],
  );

  const updatePrompt = useCallback(
    (id: string, patch: Partial<PromptDraft>) => mutatePrompt(id, () => ({ ...patch, updatedAt: Date.now() })),
    [mutatePrompt],
  );

  const attachImages = useCallback(
    (id: string, imageIds: string[]) =>
      mutatePrompt(id, (p) => ({ images: [...p.images, ...imageIds], updatedAt: Date.now() }), { upload: imageIds }),
    [mutatePrompt],
  );

  const removeImage = useCallback(
    (id: string, imageId: string) => {
      const others = snapshot.current.prompts.filter((p) => p.id !== id);
      const orphan = orphanedImages(others, [imageId]).length > 0;
      mutatePrompt(id, (p) => ({ images: p.images.filter((x) => x !== imageId), updatedAt: Date.now() }), {
        remove: orphan ? [imageId] : [],
      });
      return orphan;
    },
    [mutatePrompt],
  );

  const deletePrompt = useCallback((id: string) => mutatePrompt(id, () => ({ deletedAt: Date.now() })), [mutatePrompt]);

  const restorePrompt = useCallback((id: string) => mutatePrompt(id, () => ({ deletedAt: null })), [mutatePrompt]);

  const purge = useCallback(
    (ids: string[]) => {
      const d = snapshot.current;
      const targets = d.prompts.filter((p) => ids.includes(p.id));
      const remaining = d.prompts.filter((p) => !ids.includes(p.id));
      const orphans = orphanedImages(remaining, targets.flatMap((p) => p.images));
      const now = Date.now();
      commitLocal((s) =>
        local(
          s,
          {
            folders: s.folders,
            prompts: s.prompts.map((p) =>
              ids.includes(p.id) ? { ...p, title: '', body: '', tags: [], images: [], deletedAt: p.deletedAt ?? now, modifiedAt: now } : p,
            ),
          },
          ids,
          [],
          { remove: orphans },
        ),
      );
      return orphans;
    },
    [commitLocal],
  );

  const purgePrompt = useCallback((id: string) => purge([id]), [purge]);

  // Trash keeps prompts for TRASH_DAYS; after that they're erased like Empty Trash (here and in the cloud).
  useEffect(() => {
    if (!ready) return;
    const cutoff = openedAt - TRASH_DAYS * 24 * 60 * 60 * 1000;
    const expired = snapshot.current.prompts.filter((p) => p.deletedAt !== null && p.deletedAt <= cutoff && !isPurged(p));
    if (expired.length > 0) purge(expired.map((p) => p.id)).forEach(deleteLocalImage);
  }, [ready, openedAt, purge]);

  const togglePin = useCallback((id: string) => mutatePrompt(id, (p) => ({ pinned: !p.pinned })), [mutatePrompt]);

  /** Applies one change to many prompts in a single commit (and a single sync). */
  const mutateMany = useCallback(
    (ids: string[], fn: (p: Prompt) => Partial<Prompt>) => {
      if (ids.length === 0) return;
      const set = new Set(ids);
      const now = Date.now();
      commitLocal((d) =>
        local(d, { folders: d.folders, prompts: d.prompts.map((p) => (set.has(p.id) ? { ...p, ...fn(p), modifiedAt: now } : p)) }, ids),
      );
    },
    [commitLocal],
  );

  const movePrompts = useCallback(
    (ids: string[], folderId: string | null) => mutateMany(ids, () => ({ folderId, updatedAt: Date.now() })),
    [mutateMany],
  );
  const tagPrompts = useCallback(
    (ids: string[], tag: string) => {
      const t = normalizeTag(tag);
      if (t) mutateMany(ids, (p) => (p.tags.includes(t) ? {} : { tags: [...p.tags, t], updatedAt: Date.now() }));
    },
    [mutateMany],
  );
  const setPinned = useCallback((ids: string[], pinned: boolean) => mutateMany(ids, () => ({ pinned })), [mutateMany]);
  const deletePrompts = useCallback((ids: string[]) => mutateMany(ids, () => ({ deletedAt: Date.now() })), [mutateMany]);
  const restorePrompts = useCallback((ids: string[]) => mutateMany(ids, () => ({ deletedAt: null })), [mutateMany]);

  const recordCopy = useCallback(
    (id: string, at: number = Date.now()) => {
      // Prompts copied straight from the library aren't saved, so there's nothing to count (or sync).
      if (!snapshot.current.prompts.some((p) => p.id === id)) return;
      // A copy isn't an edit: modifiedAt stays, so this can never win over newer text from another
      // device. The server only raises the copy stats (supabase/copy_stats.sql).
      commitLocal((d) =>
        local(d, { folders: d.folders, prompts: d.prompts.map((p) => (p.id === id ? { ...p, copyCount: p.copyCount + 1, lastCopiedAt: Math.max(p.lastCopiedAt ?? 0, at) } : p)) }, [id]),
      );
    },
    [commitLocal],
  );

  const createFolder = useCallback(
    (name: string, color?: string) => {
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
    },
    [commitLocal],
  );

  const updateFolder = useCallback(
    (id: string, patch: Partial<Pick<Folder, 'name' | 'color'>>) => {
      commitLocal((d) =>
        local(d, { prompts: d.prompts, folders: d.folders.map((f) => (f.id === id ? { ...f, ...patch, modifiedAt: Date.now() } : f)) }, [], [id]),
      );
    },
    [commitLocal],
  );

  // Deleting a category keeps its prompts; they become uncategorised.
  const deleteFolder = useCallback(
    (id: string) => {
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
    },
    [commitLocal],
  );

  const ensureFolders = useCallback(
    (wanted: Pick<Folder, 'id' | 'name' | 'color'>[]) => {
      const missing = wanted.filter((w) => !snapshot.current.folders.some((f) => f.id === w.id));
      if (missing.length === 0) return;
      // modifiedAt 0, like the seed data: a rename or delete on any device always wins over this copy.
      const now = Date.now();
      const created: Folder[] = missing.map((m) => ({ ...m, createdAt: now, modifiedAt: 0, deletedAt: null }));
      commitLocal((d) =>
        local(
          d,
          { prompts: d.prompts, folders: [...d.folders, ...created.filter((c) => !d.folders.some((f) => f.id === c.id))] },
          [],
          created.map((c) => c.id),
        ),
      );
    },
    [commitLocal],
  );

  const importBackup = useCallback(
    (backup: { prompts: Prompt[]; folders: Folder[] }) => {
      const merged = mergeBackup(snapshot.current, backup, Date.now());
      const images = merged.prompts.filter((p) => merged.touchedPrompts.includes(p.id)).flatMap((p) => p.images);
      commitLocal((d) => {
        const again = mergeBackup(d, backup, Date.now());
        return local(d, { prompts: again.prompts, folders: again.folders }, again.touchedPrompts, again.touchedFolders, { upload: images });
      });
      return merged.result;
    },
    [commitLocal],
  );

  const getSnapshot = useCallback(() => snapshot.current, []);

  const applyRemote = useCallback<SyncStoreApi['applyRemote']>((remote, lastPulledAt) => {
    const apply = (d: StoreData): StoreData =>
      remote.prompts.length === 0 && remote.folders.length === 0 && lastPulledAt === d.sync.lastPulledAt
        ? d
        : {
            ...d,
            prompts: mergePrompts(d.prompts, remote.prompts),
            folders: mergeRecords(d.folders, remote.folders),
            sync: { ...d.sync, lastPulledAt },
          };
    // The sync engine reads the snapshot straight after this to find images to download, before
    // React has rendered. Without this, a new phone sees none of its pulled images on the first sync.
    snapshot.current = apply(snapshot.current);
    setData(apply);
  }, []);

  const markPushed = useCallback<SyncStoreApi['markPushed']>((sent) => {
    setData((d) => ({
      ...d,
      sync: {
        ...d.sync,
        pendingPrompts: clearPending(d.sync.pendingPrompts, d.prompts, sent.prompts, promptVersion),
        pendingFolders: clearPending(d.sync.pendingFolders, d.folders, sent.folders),
      },
    }));
  }, []);

  const markImagesSynced = useCallback<SyncStoreApi['markImagesSynced']>(({ uploaded, deleted }) => {
    if (uploaded.length === 0 && deleted.length === 0) return;
    setData((d) => ({
      ...d,
      sync: {
        ...d.sync,
        pendingImageUploads: removeIds(d.sync.pendingImageUploads, uploaded),
        pendingImageDeletes: removeIds(d.sync.pendingImageDeletes, deleted),
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
        pendingImageUploads: [...new Set(d.prompts.flatMap((p) => p.images))],
        pendingImageDeletes: [],
      },
    }));
  }, []);

  const forgetAccount = useCallback(() => setData((d) => ({ ...d, sync: emptySyncMeta() })), []);

  const eraseAll = useCallback(() => {
    const images = [...new Set(snapshot.current.prompts.flatMap((p) => p.images))];
    setData({ ...seedData, sync: emptySyncMeta() });
    return images;
  }, []);

  const sync = useMemo<SyncStoreApi>(
    () => ({ meta: data.sync, localRevision, getSnapshot, applyRemote, markPushed, markImagesSynced, resetForUser, forgetAccount }),
    [data.sync, localRevision, getSnapshot, applyRemote, markPushed, markImagesSynced, resetForUser, forgetAccount],
  );

  const value = useMemo<PromptStore>(() => {
    const prompts = data.prompts.filter((p) => p.deletedAt === null);
    const folders = data.folders.filter((f) => f.deletedAt === null);
    const cutoff = openedAt - TRASH_DAYS * 24 * 60 * 60 * 1000;
    const trash = data.prompts
      .filter((p) => p.deletedAt !== null && p.deletedAt > cutoff && !isPurged(p))
      .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
    const getPrompt = (id: string) => prompts.find((p) => p.id === id);
    const allTags = [...new Set(prompts.flatMap((p) => p.tags))].sort();
    return {
      ready,
      loadFailed,
      retryLoad: read,
      saveFailures,
      pruneSafe,
      prompts,
      folders,
      trash,
      allTags,
      getPrompt,
      getFolder: (id) => (id ? folders.find((f) => f.id === id) : undefined),
      createPrompt,
      updatePrompt,
      attachImages,
      removeImage,
      deletePrompt,
      restorePrompt,
      movePrompts,
      tagPrompts,
      setPinned,
      deletePrompts,
      restorePrompts,
      purgePrompt,
      emptyTrash: () => purge(trash.map((p) => p.id)),
      duplicatePrompt: (id) => {
        const src = getPrompt(id);
        if (!src) return undefined;
        // Image files are shared by id; a file is only deleted once no prompt uses it.
        // An untitled prompt's copy stays untitled, rather than being called " (copy)".
        return createPrompt({ title: src.title ? `${src.title} (copy)` : '', body: src.body, folderId: src.folderId, tags: src.tags, images: src.images });
      },
      togglePin,
      recordCopy,
      createFolder,
      updateFolder,
      deleteFolder,
      ensureFolders,
      eraseAll,
      importBackup,
      sync,
    };
  }, [
    data,
    ready,
    loadFailed,
    read,
    saveFailures,
    pruneSafe,
    openedAt,
    createPrompt,
    updatePrompt,
    attachImages,
    removeImage,
    deletePrompt,
    restorePrompt,
    movePrompts,
    tagPrompts,
    setPinned,
    deletePrompts,
    restorePrompts,
    purgePrompt,
    purge,
    togglePin,
    recordCopy,
    createFolder,
    updateFolder,
    deleteFolder,
    ensureFolders,
    eraseAll,
    importBackup,
    sync,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePromptStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePromptStore must be used inside PromptStoreProvider');
  return ctx;
}
