import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { defaultAiApps } from '@/lib/ai';

const STORAGE_KEY = 'promptheart/settings';

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
};

type SettingsContext = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const Ctx = createContext<SettingsContext | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Settings>;
        // Merge per app so apps added in later versions get their default.
        setSettings({ ...DEFAULT_SETTINGS, ...saved, aiApps: { ...DEFAULT_SETTINGS.aiApps, ...saved.aiApps } });
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
