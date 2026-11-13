import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { defaultAiApps } from '@/lib/ai';
import { readWithRetries } from '@/lib/readRetry';
import { SETTINGS_STORAGE_KEY } from '@/lib/storageKeys';

const STORAGE_KEY = SETTINGS_STORAGE_KEY;

export type ThemeMode = 'system' | 'light' | 'dark';
export type AccentKey = 'amber' | 'blue' | 'green' | 'rose' | 'violet';
export type SortKey = 'recent' | 'most-used' | 'title';

export type Settings = {
  themeMode: ThemeMode;
  accent: AccentKey;
  layout: 'list' | 'grid';
  sort: SortKey;
  previewLines: 2 | 4 | 6;
  haptics: boolean;
  showTokens: boolean;
  /** Which AI apps are on (app key -> enabled). Off apps are hidden everywhere, folders included. */
  aiApps: Record<string, boolean>;
  /** Row of AI app shortcuts on the home screen. */
  showAiBar: boolean;
  /** One-time tips the user has closed. */
  dismissedTips: string[];
  /** Ask for fingerprint, face or the phone's screen lock to open the app. */
  appLock: boolean;
  /** How long the app can be in the background before it locks again, in seconds (0 = straight away). */
  lockAfter: 0 | 60 | 300;
  /** The update whose "What's new" card was already shown. */
  seenUpdate: string | null;
  /** The first-run welcome was finished or skipped. */
  onboarded: boolean;
  /** With App lock on, the home-screen widget still shows prompts. */
  widgetWhileLocked: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'system',
  accent: 'amber',
  layout: 'list',
  sort: 'recent',
  previewLines: 4,
  haptics: true,
  showTokens: true,
  aiApps: defaultAiApps(),
  showAiBar: true,
  dismissedTips: [],
  appLock: false,
  lockAfter: 60,
  seenUpdate: null,
  onboarded: false,
  widgetWhileLocked: false,
};

type SettingsContext = {
  settings: Settings;
  /** False until saved settings are loaded (so the app lock never flashes the app open first). Stays false while `loadFailed`. */
  ready: boolean;
  /**
   * The phone couldn't read the saved settings, so the defaults stand in for this session. Nothing is saved,
   * and App lock counts as on, since we can't tell whether it was.
   */
  loadFailed: boolean;
  /** True when this phone had no saved settings: a fresh install (or cleared app data). */
  firstRun: boolean;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const Ctx = createContext<SettingsContext | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const loaded = useRef(false);
  const [ready, setReady] = useState(false);
  const [firstRun, setFirstRun] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    // The app stays covered while this retries, so nothing can change the settings in the meantime.
    readWithRetries(() => AsyncStorage.getItem(STORAGE_KEY)).then(
      (raw) => {
        if (!raw) {
          setFirstRun(true);
        } else {
          try {
            const saved = JSON.parse(raw) as Partial<Settings>;
            // Merge per app so apps added in later versions get their default.
            // Anyone with saved settings from before the welcome existed has already started; don't show it to them.
            setSettings({ ...DEFAULT_SETTINGS, onboarded: true, ...saved, aiApps: { ...DEFAULT_SETTINGS.aiApps, ...saved.aiApps } });
          } catch {
            // Unreadable: start from the defaults.
          }
        }
        loaded.current = true;
        setReady(true);
      },
      // We don't know what's saved, App lock included. `ready` stays false, so the welcome and What's new
      // don't run on the defaults, and nothing is saved over the real settings.
      () => setLoadFailed(true),
    );
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  // Resetting keeps the app lock as it is (turning a lock off should always be deliberate) and doesn't
  // bring back a What's new card that was already read.
  const reset = useCallback(() => setSettings((s) => ({ ...DEFAULT_SETTINGS, appLock: s.appLock, lockAfter: s.lockAfter, seenUpdate: s.seenUpdate, onboarded: s.onboarded })), []);

  const value = useMemo(() => ({ settings, ready, loadFailed, firstRun, update, reset }), [settings, ready, loadFailed, firstRun, update, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
