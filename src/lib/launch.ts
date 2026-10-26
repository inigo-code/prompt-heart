import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

import type { AiApp } from '@/lib/ai';

/** How the app was opened: in the app with the prompt typed in, in the app to paste, or in the browser. */
export type LaunchResult = 'app-prefilled' | 'app' | 'web';

const FLAG_ACTIVITY_NEW_TASK = 0x10000000;

/**
 * Opens an AI app. On Android this targets the app by package name, so only that app can answer
 * (a plain https link can open both the app and the browser, or skip the app entirely):
 *   1. the app, given the prefill link (apps that support it show the prompt typed in);
 *   2. otherwise the app's home screen (the prompt is on the clipboard: paste);
 *   3. only if it isn't installed, the website.
 * Elsewhere it opens the web address.
 */
export async function openAiApp(app: AiApp, text?: string): Promise<LaunchResult> {
  const url = text ? app.url(text) : app.home;

  if (Platform.OS === 'android' && app.androidPackage) {
    try {
      // Rejects straight away when the app can't handle this link (or isn't installed).
      // Not awaited for success: the promise only settles when the user comes back.
      await Promise.race([
        IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: url,
          packageName: app.androidPackage,
          flags: FLAG_ACTIVITY_NEW_TASK,
        }),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
      return text && app.prefills ? 'app-prefilled' : 'app';
    } catch {
      try {
        IntentLauncher.openApplication(app.androidPackage);
        return 'app';
      } catch {
        // Not installed: fall through to the website.
      }
    }
  }

  await Linking.openURL(url);
  return text && app.prefills ? 'app-prefilled' : 'web';
}
