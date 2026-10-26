import { useEffect, useMemo } from 'react';

import { AI_APPS, aiAppForFolder, aiFolderId } from '@/lib/ai';
import type { AiApp } from '@/lib/ai';
import { useSettings } from '@/settings/SettingsProvider';
import { usePromptStore } from '@/store/PromptStore';
import type { Folder } from '@/store/types';

/** AI apps that are switched on in Settings, in catalogue order. */
export function useEnabledAiApps(): AiApp[] {
  const { settings } = useSettings();
  return useMemo(() => AI_APPS.filter((a) => settings.aiApps[a.key]), [settings.aiApps]);
}

/** Categories to show: everything except folders belonging to AI apps that are switched off. */
export function useVisibleFolders(): Folder[] {
  const { folders } = usePromptStore();
  const { settings } = useSettings();
  return useMemo(
    () =>
      folders.filter((f) => {
        const app = aiAppForFolder(f.id);
        return !app || settings.aiApps[app.key];
      }),
    [folders, settings.aiApps],
  );
}

/** The AI app a prompt launches in (its folder's app), if that app is switched on. */
export function useLaunchApp(folderId: string | null): AiApp | undefined {
  const { settings } = useSettings();
  const app = aiAppForFolder(folderId);
  return app && settings.aiApps[app.key] ? app : undefined;
}

/** Makes sure every switched-on AI app has its category. */
export function useEnsureAiFolders() {
  const { ready, ensureFolders } = usePromptStore();
  const apps = useEnabledAiApps();
  useEffect(() => {
    if (!ready) return;
    ensureFolders(apps.map((a) => ({ id: aiFolderId(a.key), name: a.label, color: a.color })));
  }, [ready, apps, ensureFolders]);
}
