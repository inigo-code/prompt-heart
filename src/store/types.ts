export type Prompt = {
  id: string;
  title: string;
  body: string;
  folderId: string | null;
  tags: string[];
  pinned: boolean;
  /** Attached image ids (files live in the images folder and in cloud storage). Never copied with the prompt. */
  images: string[];
  copyCount: number;
  createdAt: number;
  /** Last content edit; drives the "recent" sort. */
  updatedAt: number;
  lastCopiedAt: number | null;
  /** Last change of any kind; drives sync conflict resolution. */
  modifiedAt: number;
  /** Soft delete: the prompt sits in Trash, and the deletion can sync to other devices. */
  deletedAt: number | null;
};

export type Folder = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  modifiedAt: number;
  deletedAt: number | null;
};

export type SyncMeta = {
  /** Account this device last synced with; a different account triggers a full upload. */
  userId: string | null;
  /** Server timestamp of the newest change pulled so far. */
  lastPulledAt: string | null;
  /** Ids changed locally that the server hasn't confirmed yet. */
  pendingPrompts: string[];
  pendingFolders: string[];
  /** Image ids to upload to / remove from cloud storage. */
  pendingImageUploads: string[];
  pendingImageDeletes: string[];
};

export type StoreData = {
  version: 2;
  prompts: Prompt[];
  folders: Folder[];
  sync: SyncMeta;
};

export type PromptDraft = Pick<Prompt, 'title' | 'body' | 'folderId' | 'tags' | 'pinned' | 'images'>;
