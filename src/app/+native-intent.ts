import { getShareExtensionKey } from 'expo-share-intent';

// Content shared from another app arrives as a deep link; send it to the Share screen
// instead of letting the router try (and fail) to match it as a page.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return '/share';
    return path;
  } catch {
    return '/';
  }
}
