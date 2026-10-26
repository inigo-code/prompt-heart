import type { Folder, Prompt, StoreData } from './types';

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
 * Drops ids from the pending list once the server has the version we sent.
 * Ids edited again while the upload was in flight stay pending; ids with no record are dropped.
 */
export function clearPending<T extends Versioned>(pending: string[], records: T[], sent: Record<string, number>): string[] {
  const current = new Map(records.map((r) => [r.id, r.modifiedAt]));
  return pending.filter((id) => current.has(id) && (!(id in sent) || current.get(id) !== sent[id]));
}

/** Upgrades data saved by older app versions. */
export function migrate(raw: unknown): StoreData {
  const d = raw as Partial<StoreData> & { version?: number };
  if (d.version === 2) return d as StoreData;
  type V1Prompt = Omit<Prompt, 'modifiedAt' | 'deletedAt'>;
  type V1Folder = Omit<Folder, 'modifiedAt' | 'deletedAt'>;
  return {
    version: 2,
    prompts: ((d.prompts ?? []) as V1Prompt[]).map((p) => ({ ...p, modifiedAt: p.updatedAt, deletedAt: null })),
    folders: ((d.folders ?? []) as V1Folder[]).map((f) => ({ ...f, modifiedAt: f.createdAt, deletedAt: null })),
    sync: { userId: null, lastPulledAt: null, pendingPrompts: [], pendingFolders: [] },
  };
}
