/**
 * Whether the app should lock again when it comes back to the foreground: it was in the background
 * for at least `lockAfterS` seconds (0 means straight away).
 */
export function shouldLockOnReturn(lockAfterS: number, backgroundedAt: number | null, now: number): boolean {
  if (backgroundedAt === null) return false;
  return now - backgroundedAt >= lockAfterS * 1000;
}

export const LOCK_AFTER_OPTIONS = [
  { value: 0, label: 'Immediately' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
] as const;
