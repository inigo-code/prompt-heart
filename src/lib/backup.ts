import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { APP_NAME, APP_SLUG } from '@/lib/app';
import { imageBase64, imagesSupported, writeImageBase64 } from '@/lib/images';
import { parseImport, toCsv } from '@/lib/importFiles';
import type { ParsedFile } from '@/lib/importFiles';
import type { Folder, Prompt } from '@/store/types';

const FORMAT = 'promptheart-backup';
const FORMAT_VERSION = 1;

export type Backup = {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  folders: Folder[];
  prompts: Prompt[];
  /** Image id -> base64 JPEG. Optional: backups made on web have none. */
  images?: Record<string, string>;
};

const stamp = () => new Date().toISOString().slice(0, 10);

async function share(name: string, contents: string, mimeType: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(contents);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: `Save ${APP_NAME} backup` });
}

/** Exports live prompts and categories (with images) as one JSON file via the share sheet. */
export async function exportBackup(prompts: Prompt[], folders: Folder[]): Promise<{ prompts: number; images: number }> {
  const images: Record<string, string> = {};
  if (imagesSupported) {
    for (const id of new Set(prompts.flatMap((p) => p.images))) {
      const b64 = await imageBase64(id);
      if (b64) images[id] = b64;
    }
  }
  const backup: Backup = { format: FORMAT, version: FORMAT_VERSION, exportedAt: new Date().toISOString(), folders, prompts, images };
  await share(`${APP_SLUG}-backup-${stamp()}.json`, JSON.stringify(backup), 'application/json');
  return { prompts: prompts.length, images: Object.keys(images).length };
}

/** Exports prompts as a readable Markdown document (text only). */
export async function exportMarkdown(prompts: Prompt[], folders: Folder[]) {
  const name = (id: string | null) => folders.find((f) => f.id === id)?.name ?? 'Uncategorised';
  const groups = new Map<string, Prompt[]>();
  for (const p of prompts) groups.set(name(p.folderId), [...(groups.get(name(p.folderId)) ?? []), p]);
  const out = [`# ${APP_NAME} prompts`, '', `Exported ${new Date().toLocaleString()}`, ''];
  for (const [group, list] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    out.push(`## ${group}`, '');
    for (const p of list) {
      out.push(`### ${p.title || 'Untitled'}`);
      if (p.tags.length) out.push(p.tags.map((t) => `#${t}`).join(' '));
      out.push('', '```', p.body, '```', '');
    }
  }
  await share(`${APP_SLUG}-prompts-${stamp()}.md`, out.join('\n'), 'text/markdown');
}

/** Exports prompts as a spreadsheet (CSV), one row per prompt. It reads back in with "Import from other apps". */
export async function exportCsv(prompts: Prompt[], folders: Folder[]) {
  // The byte-order mark tells Excel the file is UTF-8, so accents and emoji survive.
  await share(`${APP_SLUG}-prompts-${stamp()}.csv`, '﻿' + toCsv(prompts, folders), 'text/csv');
}

const readText = async (uri: string) => (Platform.OS === 'web' ? (await fetch(uri)).text() : new File(uri).text());

/**
 * Lets the user pick one or more files exported by other apps (CSV, JSON, Markdown or text) and reads
 * the prompts in them. Returns null if cancelled; files that can't be read are listed in `errors`.
 */
export async function pickImportFiles(): Promise<{ files: ParsedFile[]; errors: string[] } | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'application/json', 'text/markdown', 'text/plain', 'text/tab-separated-values', '*/*'],
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const files: ParsedFile[] = [];
  const errors: string[] = [];
  for (const asset of res.assets) {
    try {
      files.push(parseImport(asset.name, await readText(asset.uri)));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  return { files, errors };
}

/** Lets the user pick a backup file; returns null if cancelled. Throws on files that aren't backups. */
export async function pickBackup(): Promise<Backup | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  const text = Platform.OS === 'web' ? await (await fetch(asset.uri)).text() : await new File(asset.uri).text();

  let data: Backup;
  try {
    data = JSON.parse(text) as Backup;
  } catch {
    throw new Error("That file isn't a valid backup (it isn't JSON).");
  }
  if (data.format !== FORMAT || !Array.isArray(data.prompts) || !Array.isArray(data.folders)) {
    throw new Error(`That file isn't a ${APP_NAME} backup.`);
  }
  if (data.version > FORMAT_VERSION) throw new Error('That backup was made by a newer version of the app. Update first.');
  return data;
}

/** Writes a backup's images to this device so the merged prompts can show (and sync) them. */
export async function restoreBackupImages(backup: Backup): Promise<number> {
  if (!imagesSupported || !backup.images) return 0;
  let n = 0;
  for (const [id, b64] of Object.entries(backup.images)) {
    await writeImageBase64(id, b64);
    n++;
  }
  return n;
}
