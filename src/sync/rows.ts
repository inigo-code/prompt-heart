import type { Folder, Prompt } from '@/store/types';

// Database rows (snake_case, see supabase/schema.sql) <-> app records (camelCase).

export type FolderRow = {
  user_id: string;
  id: string;
  name: string;
  color: string;
  created_at: number;
  modified_at: number;
  deleted_at: number | null;
  server_updated_at?: string;
};

export type PromptRow = {
  user_id: string;
  id: string;
  title: string;
  body: string;
  folder_id: string | null;
  tags: string[];
  pinned: boolean;
  copy_count: number;
  created_at: number;
  updated_at: number;
  last_copied_at: number | null;
  modified_at: number;
  deleted_at: number | null;
  server_updated_at?: string;
};

// bigint columns can come back as strings, so coerce.
const num = (v: unknown) => Number(v);
const numOrNull = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export const folderToRow = (f: Folder, userId: string): FolderRow => ({
  user_id: userId,
  id: f.id,
  name: f.name,
  color: f.color,
  created_at: f.createdAt,
  modified_at: f.modifiedAt,
  deleted_at: f.deletedAt,
});

export const rowToFolder = (r: FolderRow): Folder => ({
  id: r.id,
  name: r.name,
  color: r.color,
  createdAt: num(r.created_at),
  modifiedAt: num(r.modified_at),
  deletedAt: numOrNull(r.deleted_at),
});

export const promptToRow = (p: Prompt, userId: string): PromptRow => ({
  user_id: userId,
  id: p.id,
  title: p.title,
  body: p.body,
  folder_id: p.folderId,
  tags: p.tags,
  pinned: p.pinned,
  copy_count: p.copyCount,
  created_at: p.createdAt,
  updated_at: p.updatedAt,
  last_copied_at: p.lastCopiedAt,
  modified_at: p.modifiedAt,
  deleted_at: p.deletedAt,
});

export const rowToPrompt = (r: PromptRow): Prompt => ({
  id: r.id,
  title: r.title,
  body: r.body,
  folderId: r.folder_id,
  tags: r.tags ?? [],
  pinned: r.pinned,
  copyCount: r.copy_count,
  createdAt: num(r.created_at),
  updatedAt: num(r.updated_at),
  lastCopiedAt: numOrNull(r.last_copied_at),
  modifiedAt: num(r.modified_at),
  deletedAt: numOrNull(r.deleted_at),
});
