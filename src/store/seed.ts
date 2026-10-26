import type { StoreData } from './types';

const now = Date.now();

// Shown on first launch so the home screen isn't empty. modifiedAt is 0 so any real edit
// (on any device) wins over the seed copy when syncing.
export const seedData: StoreData = {
  version: 2,
  sync: { userId: null, lastPulledAt: null, pendingPrompts: [], pendingFolders: [] },
  folders: [
    { id: 'f-writing', name: 'Writing', color: '#F2B84B', createdAt: now, modifiedAt: 0, deletedAt: null },
    { id: 'f-coding', name: 'Coding', color: '#5B8DEF', createdAt: now, modifiedAt: 0, deletedAt: null },
    { id: 'f-research', name: 'Research', color: '#4CB782', createdAt: now, modifiedAt: 0, deletedAt: null },
  ],
  prompts: [
    {
      id: 'p-welcome',
      title: 'Welcome to Prompt Notes',
      body: 'Tap the copy icon on any card to put the prompt on your clipboard. Tap the card itself to edit it.\n\nUse categories to file prompts, and #tags to group related ones across categories.',
      folderId: null,
      tags: ['tips'],
      pinned: true,
      copyCount: 0,
      createdAt: now,
      updatedAt: now,
      lastCopiedAt: null,
      modifiedAt: 0,
      deletedAt: null,
    },
    {
      id: 'p-review',
      title: 'Code reviewer',
      body: 'Review the following code for bugs, edge cases and readability. List issues by severity, then suggest a corrected version.\n\n{{code}}',
      folderId: 'f-coding',
      tags: ['review'],
      pinned: false,
      copyCount: 0,
      createdAt: now - 1000,
      updatedAt: now - 1000,
      lastCopiedAt: null,
      modifiedAt: 0,
      deletedAt: null,
    },
    {
      id: 'p-tone',
      title: 'Rewrite in a friendly tone',
      body: 'Rewrite the text below so it sounds warm and conversational, keep it under 120 words, and keep every fact intact.\n\n{{text}}',
      folderId: 'f-writing',
      tags: ['editing', 'email'],
      pinned: false,
      copyCount: 0,
      createdAt: now - 2000,
      updatedAt: now - 2000,
      lastCopiedAt: null,
      modifiedAt: 0,
      deletedAt: null,
    },
    {
      id: 'p-summary',
      title: 'Paper summary',
      body: 'Summarise this paper in 5 bullet points: the question, method, key result, limitations, and why it matters.\n\n{{paper}}',
      folderId: 'f-research',
      tags: ['summary'],
      pinned: false,
      copyCount: 0,
      createdAt: now - 3000,
      updatedAt: now - 3000,
      lastCopiedAt: null,
      modifiedAt: 0,
      deletedAt: null,
    },
  ],
};
