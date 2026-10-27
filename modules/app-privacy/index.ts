import { requireOptionalNativeModule } from 'expo-modules-core';

type AppPrivacyModule = {
  /** Hides (or shows again) the app's preview in the recent-apps switcher. False if there's no activity yet. */
  setHiddenInRecents(hidden: boolean): boolean;
};

// Android-only native module (modules/app-privacy). Null on iOS, web and Expo Go.
export const AppPrivacy = requireOptionalNativeModule<AppPrivacyModule>('AppPrivacy');
