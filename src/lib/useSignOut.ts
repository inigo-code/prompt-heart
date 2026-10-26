import { useCallback } from 'react';

import { deleteLocalImage } from '@/lib/images';
import { useProfile } from '@/profile/ProfileProvider';
import { useHistory } from '@/store/HistoryProvider';
import { usePromptStore } from '@/store/PromptStore';
import { useSync } from '@/sync/SyncProvider';

/**
 * Signs out. Unsynced changes are uploaded first so nothing is lost. The profile (name, photo)
 * always goes, since it belongs to the account. With `eraseDevice`, the prompts, images and version
 * history on this phone are removed too (the account keeps its copy and brings them back on sign-in).
 */
export function useSignOut() {
  const { pendingCount, syncNow, signOut } = useSync();
  const profile = useProfile();
  const store = usePromptStore();
  const history = useHistory();

  return useCallback(
    async (eraseDevice: boolean) => {
      if (pendingCount > 0) await syncNow().catch(() => {});
      await signOut();
      profile.clear();
      if (eraseDevice) {
        store.eraseAll().forEach(deleteLocalImage);
        history.clearAll();
      } else {
        store.sync.forgetAccount();
      }
    },
    [pendingCount, syncNow, signOut, profile, store, history],
  );
}
