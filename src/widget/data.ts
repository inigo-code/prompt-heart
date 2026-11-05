import AsyncStorage from '@react-native-async-storage/async-storage';

import { extractVariables } from '@/lib/templates';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/settings/SettingsProvider';
import type { Settings } from '@/settings/SettingsProvider';
import { migrate } from '@/store/merge';
import { PROMPTS_STORAGE_KEY } from '@/store/PromptStore';
import type { Folder, Prompt } from '@/store/types';

/** Must match the widget's `name` in app.json. */
export const WIDGET_NAME = 'Prompts';
/** Copies made from the widget while the app was closed, counted when the app next opens. */
const WIDGET_COPY_PREFIX = 'promptheart/widget-copy/';
/** The single list 1.8.0 kept them in, read once so nothing queued before this update is lost. */
const WIDGET_COPIES_KEY = 'promptheart/widget-copies';
/** Enough for the tallest widget; each widget shows as many as fit its height. */
const MAX_ROWS = 12;

export type WidgetPrompt = {
  id: string;
  title: string;
  body: string;
  /** The category's name and colour, or the start of the text when there's no category. */
  note: string;
  color: string | null;
  blanks: number;
};

export type WidgetData = Pick<Settings, 'appLock' | 'themeMode' | 'accent'> & { prompts: WidgetPrompt[] };

const newest = (p: Prompt) => Math.max(p.lastCopiedAt ?? 0, p.updatedAt);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Pinned prompts first, then the most copied, then the newest. */
export function widgetPrompts(prompts: Prompt[], folders: Folder[]): WidgetPrompt[] {
  const live = prompts.filter((p) => p.deletedAt === null && (p.title || p.body));
  const pinned = live.filter((p) => p.pinned).sort((a, b) => newest(b) - newest(a));
  const rest = live.filter((p) => !p.pinned).sort((a, b) => b.copyCount - a.copyCount || newest(b) - newest(a));
  const byId = new Map(folders.filter((f) => f.deletedAt === null).map((f) => [f.id, f]));
  return [...pinned, ...rest].slice(0, MAX_ROWS).map((p) => {
    const folder = p.folderId ? byId.get(p.folderId) : undefined;
    const blanks = extractVariables(p.body).length;
    const start = p.body.replace(/\s+/g, ' ').trim();
    return {
      id: p.id,
      title: p.title || start.slice(0, 60) || 'Untitled',
      body: p.body,
      note: blanks ? plural(blanks, 'blank') + ' to fill' : (folder?.name ?? start),
      color: folder?.color ?? null,
      blanks,
    };
  });
}

export function widgetData(prompts: Prompt[], folders: Folder[], settings: Settings): WidgetData {
  return { appLock: settings.appLock && !settings.widgetWhileLocked, themeMode: settings.themeMode, accent: settings.accent, prompts: widgetPrompts(prompts, folders) };
}

/** What the widget shows when the app isn't running: read straight from the app's storage. */
export async function readWidgetData(): Promise<WidgetData> {
  const [rawStore, rawSettings] = await Promise.all([
    AsyncStorage.getItem(PROMPTS_STORAGE_KEY).catch(() => null),
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY).catch(() => null),
  ]);
  let settings: Settings = DEFAULT_SETTINGS;
  try {
    if (rawSettings) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) };
  } catch {}
  try {
    const store = rawStore ? migrate(JSON.parse(rawStore)) : null;
    return widgetData(store?.prompts ?? [], store?.folders ?? [], settings);
  } catch {
    return widgetData([], [], settings);
  }
}

/** The last few background runs, shown under About in test builds. */
const WIDGET_LOG_KEY = 'promptheart/widget-log';
export type WidgetLogEntry = { at: number; action: string; height: number; error?: string };

export async function logWidgetRun(entry: WidgetLogEntry) {
  const raw = await AsyncStorage.getItem(WIDGET_LOG_KEY).catch(() => null);
  let list: WidgetLogEntry[] = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch {}
  await AsyncStorage.setItem(WIDGET_LOG_KEY, JSON.stringify([entry, ...list].slice(0, 6))).catch(() => {});
}

export async function readWidgetLog(): Promise<WidgetLogEntry[]> {
  const raw = await AsyncStorage.getItem(WIDGET_LOG_KEY).catch(() => null);
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export type WidgetCopy = { id: string; at: number };

/** One key per copy, so two quick taps can't overwrite each other. */
export async function queueWidgetCopy(id: string) {
  const at = Date.now();
  await AsyncStorage.setItem(`${WIDGET_COPY_PREFIX}${at}/${id}`, JSON.stringify({ id, at }));
}

const validCopy = (c: Partial<WidgetCopy> | null): c is WidgetCopy => typeof c?.id === 'string' && typeof c.at === 'number';

function parseCopies(raw: string | null): WidgetCopy[] {
  try {
    return raw ? [JSON.parse(raw)].flat().filter(validCopy) : [];
  } catch {
    return [];
  }
}

/**
 * Takes the widget's copies out of storage so the app can count them once. Only the keys it read are
 * removed, so a copy made meanwhile waits for next time. If removing fails nothing is counted yet.
 */
export async function takeWidgetCopies(): Promise<WidgetCopy[]> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k === WIDGET_COPIES_KEY || k.startsWith(WIDGET_COPY_PREFIX));
    if (!keys.length) return [];
    const entries = await AsyncStorage.multiGet(keys);
    await AsyncStorage.multiRemove(keys);
    return entries.flatMap(([, raw]) => parseCopies(raw)).sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}
