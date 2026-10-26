import { seedData } from './seed';
import type { Folder, Prompt, StoreData, SyncMeta } from './types';

type Versioned = { id: string; modifiedAt: number };

/** Last-write-wins merge: a remote record replaces the local one only if it is strictly newer. */
export function mergeRecords<T extends Versioned>(local: T[], remote: T[]): T[] {
  if (remote.length === 0) return local;
  const byId = new Map(local.map((r) => [r.id, r]));
  for (const r of remote) {
    const mine = byId.get(r.id);
    if (!mine || r.modifiedAt > mine.modifiedAt) byId.set(r.id, r);
  }
  return [...byId.values()];
}

/**
 * Prompts merge like mergeRecords for their text, but copy stats only ever go up: copying isn't an
 * edit, so a copy on one device never replaces newer text from another (the server does the same).
 */
export function mergePrompts(local: Prompt[], remote: Prompt[]): Prompt[] {
  if (remote.length === 0) return local;
  const byId = new Map(local.map((p) => [p.id, p]));
  for (const r of remote) {
    const mine = byId.get(r.id);
    if (!mine) {
      byId.set(r.id, r);
      continue;
    }
    const base = r.modifiedAt > mine.modifiedAt ? r : mine;
    const copyCount = Math.max(mine.copyCount, r.copyCount);
    const lastCopiedAt = Math.max(mine.lastCopiedAt ?? 0, r.lastCopiedAt ?? 0) || null;
    byId.set(r.id, base.copyCount === copyCount && base.lastCopiedAt === lastCopiedAt ? base : { ...base, copyCount, lastCopiedAt });
  }
  return [...byId.values()];
}

/** What identifies the uploaded state of a prompt: its text version plus its copy count. */
export const promptVersion = (p: Prompt) => `${p.modifiedAt}:${p.copyCount}`;

/**
 * Drops ids from the pending list once the server has the version we sent.
 * Ids changed again while the upload was in flight stay pending; ids with no record are dropped.
 */
export function clearPending<T extends Versioned>(
  pending: string[],
  records: T[],
  sent: Record<string, number | string>,
  version: (r: T) => number | string = (r) => r.modifiedAt,
): string[] {
  const current = new Map(records.map((r) => [r.id, version(r)]));
  return pending.filter((id) => current.has(id) && (!(id in sent) || current.get(id) !== sent[id]));
}

export const emptySyncMeta = (): SyncMeta => ({
  userId: null,
  lastPulledAt: null,
  pendingPrompts: [],
  pendingFolders: [],
  pendingImageUploads: [],
  pendingImageDeletes: [],
});

/**
 * Sample prompts the user never touched (modifiedAt 0, not deleted) get the current sample text,
 * so they don't keep an old app name after a rename. Edited samples are the user's and stay as they are.
 */
function refreshSample(p: Prompt): Prompt {
  if (p.modifiedAt !== 0 || p.deletedAt !== null) return p;
  const fresh = seedData.prompts.find((s) => s.id === p.id);
  return fresh ? { ...p, title: fresh.title, body: fresh.body, tags: fresh.tags } : p;
}

/** Upgrades data saved by older app versions, and fills fields added since. */
export function migrate(raw: unknown): StoreData {
  const d = raw as Partial<StoreData> & { version?: number };
  if (d.version === 2) {
    return {
      ...(d as StoreData),
      prompts: (d.prompts ?? []).map((p) => refreshSample({ ...p, images: p.images ?? [] })),
      sync: { ...emptySyncMeta(), ...d.sync },
    };
  }
  type V1Prompt = Omit<Prompt, 'modifiedAt' | 'deletedAt' | 'images'>;
  type V1Folder = Omit<Folder, 'modifiedAt' | 'deletedAt'>;
  return {
    version: 2,
    prompts: ((d.prompts ?? []) as V1Prompt[]).map((p) => ({ ...p, images: [], modifiedAt: p.updatedAt, deletedAt: null })),
    folders: ((d.folders ?? []) as V1Folder[]).map((f) => ({ ...f, modifiedAt: f.createdAt, deletedAt: null })),
    sync: emptySyncMeta(),
  };
}

export type ImportResult = { added: number; updated: number; skipped: number; folders: number };

/**
 * Merges a backup into local data. Anything missing or deleted locally is restored as a fresh edit
 * (so it syncs out); records that exist locally are only replaced by newer backup copies.
 */
export function mergeBackup(
  local: { prompts: Prompt[]; folders: Folder[] },
  backup: { prompts: Prompt[]; folders: Folder[] },
  now: number,
): { prompts: Prompt[]; folders: Folder[]; touchedPrompts: string[]; touchedFolders: string[]; result: ImportResult } {
  const result: ImportResult = { added: 0, updated: 0, skipped: 0, folders: 0 };
  const prompts = new Map(local.prompts.map((p) => [p.id, p]));
  const folders = new Map(local.folders.map((f) => [f.id, f]));
  const touchedPrompts: string[] = [];
  const touchedFolders: string[] = [];

  for (const f of backup.folders) {
    const mine = folders.get(f.id);
    if (!mine || mine.deletedAt !== null) {
      folders.set(f.id, { ...f, deletedAt: null, modifiedAt: now });
      touchedFolders.push(f.id);
      result.folders++;
    }
  }
  for (const p of backup.prompts) {
    const mine = prompts.get(p.id);
    const incoming = { ...p, images: p.images ?? [], deletedAt: null };
    if (!mine || mine.deletedAt !== null) {
      prompts.set(p.id, { ...incoming, modifiedAt: now });
      touchedPrompts.push(p.id);
      result.added++;
    } else if (p.modifiedAt > mine.modifiedAt) {
      prompts.set(p.id, { ...incoming, modifiedAt: now });
      touchedPrompts.push(p.id);
      result.updated++;
    } else {
      result.skipped++;
    }
  }
  return { prompts: [...prompts.values()], folders: [...folders.values()], touchedPrompts, touchedFolders, result };
}
