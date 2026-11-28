// Decides what to do about the profile photo when this phone and the account disagree. Plain logic, so it is tested
// in tests/avatarSync.test.mts.

/** A photo removed here while the account couldn't be told (offline); finished on the next sync. */
export type PendingRemoval = { at: number; for: string };

export type AvatarState = {
  /** Photo version on this phone, or null. */
  local: number | null;
  /** Account the local photo was last uploaded to or downloaded from. */
  syncedFor: string | null;
  removal: PendingRemoval | null;
  userId: string;
  /** Photo version on the account, or null. */
  meta: number | null;
  /** The account has an avatar_version field at all (null counts: it was removed). */
  metaHasKey: boolean;
};

export type AvatarAction =
  | 'download' // a newer photo is on the account
  | 'upload' // a photo picked here hasn't reached the account
  | 'removedElsewhere' // removed on another device
  | 'finishRemoval' // removed here offline: remove it from the account too
  | 'dropRemoval' // the pending removal no longer applies
  | null;

export function avatarAction(s: AvatarState): AvatarAction {
  if (s.removal) {
    // Removed while signed in to another account: that removal was for that account only.
    if (s.removal.for !== s.userId) return 'dropRemoval';
    // A photo chosen on another device after the removal wins.
    if (s.meta && s.meta > s.removal.at) return 'download';
    if (s.meta) return 'finishRemoval';
    return 'dropRemoval';
  }
  const { local, meta } = s;
  if (meta && meta !== local && (!local || meta > local || s.syncedFor === s.userId)) return 'download';
  if (local && (!meta || local > meta) && s.syncedFor !== s.userId) return 'upload';
  if (!meta && s.metaHasKey && local && s.syncedFor === s.userId) return 'removedElsewhere';
  return null;
}
