import { requireOptionalNativeModule } from 'expo-modules-core';

type AiLauncherModule = {
  isInstalled(packageName: string): boolean;
  /** Opens the app on its home screen; false if it isn't installed. */
  openApp(packageName: string): boolean;
};

// Android-only native module (modules/ai-launcher). Null on iOS, web and Expo Go.
export const AiLauncher = requireOptionalNativeModule<AiLauncherModule>('AiLauncher');
