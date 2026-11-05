import { useEffect } from 'react';
import { AppState } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { useActivity } from '@/profile/ActivityProvider';
import { useSettings } from '@/settings/SettingsProvider';
import { usePromptStore } from '@/store/PromptStore';

import { WIDGET_NAME, takeWidgetCopies, widgetData } from './data';
import { promptsWidget } from './PromptsWidget';

/** Keeps the home-screen widget in step with the app, and counts copies made from it. */
export function useWidgetSync() {
  const { ready, prompts, folders, recordCopy } = usePromptStore();
  const { settings, ready: settingsReady } = useSettings();
  const { logCopy } = useActivity();
  const { appLock, widgetWhileLocked, themeMode, accent } = settings;

  useEffect(() => {
    if (!ready || !settingsReady) return;
    const data = widgetData(prompts, folders, settings);
    const t = setTimeout(() => {
      requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: (info) => promptsWidget(data, info.height) }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
    // Only what the widget shows; other settings changes don't need a redraw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settingsReady, prompts, folders, appLock, widgetWhileLocked, themeMode, accent]);

  useEffect(() => {
    if (!ready) return;
    let counting = false;
    const count = async () => {
      if (counting) return;
      counting = true;
      // recordCopy looks the prompt up itself, so prompts made since the app opened count too.
      for (const copy of await takeWidgetCopies()) {
        recordCopy(copy.id, copy.at);
        logCopy(undefined, copy.at);
      }
      counting = false;
    };
    count();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && count());
    return () => sub.remove();
  }, [ready, recordCopy, logCopy]);
}
