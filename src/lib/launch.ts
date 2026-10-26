import { Linking, Platform } from 'react-native';

import type { AiApp } from '@/lib/ai';
import { AiLauncher } from '../../modules/ai-launcher';

/** How the AI app was opened: the installed app (paste the prompt), or the website (maybe prefilled). */
export type LaunchResult = 'app' | 'web' | 'web-prefilled';

/**
 * Opens an AI app. On Android, if the app is installed it's opened directly by package name, on its
 * home screen. Plain web links proved unreliable: some apps opened alongside the browser, others not
 * at all. The prompt is already on the clipboard, so the user just pastes. Only when the app isn't
 * installed (or on iOS/web) does the website open, with the prompt prefilled where the site supports it.
 */
export async function openAiApp(app: AiApp, text?: string): Promise<LaunchResult> {
  if (Platform.OS === 'android' && app.androidPackage && AiLauncher?.openApp(app.androidPackage)) {
    return 'app';
  }
  await Linking.openURL(text ? app.url(text) : app.home);
  return text && app.prefills ? 'web-prefilled' : 'web';
}
