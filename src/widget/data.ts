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
export const WIDGET_COPIES_KEY = 'promptheart/widget-copies';
/** More than any widget size can show; the list scrolls. */
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
  return { appLock: settings.appLock, themeMode: settings.themeMode, accent: settings.accent, prompts: widgetPrompts(prompts, folders) };
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

export type WidgetCopy = { id: string; at: number };

export async function queueWidgetCopy(id: string) {
  const raw = await AsyncStorage.getItem(WIDGET_COPIES_KEY).catch(() => null);
  let list: WidgetCopy[] = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch {}
  list.push({ id, at: Date.now() });
  await AsyncStorage.setItem(WIDGET_COPIES_KEY, JSON.stringify(list.slice(-200)));
}

/** Takes the widget's copies out of storage so the app can count them once. */
export async function takeWidgetCopies(): Promise<WidgetCopy[]> {
  const raw = await AsyncStorage.getItem(WIDGET_COPIES_KEY).catch(() => null);
  if (!raw) return [];
  await AsyncStorage.removeItem(WIDGET_COPIES_KEY).catch(() => {});
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
