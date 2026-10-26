import { router } from 'expo-router';

import { ActionSheet } from '@/components/ActionSheet';
import { useToast } from '@/components/Toast';
import { useSignOut } from '@/lib/useSignOut';

type Props = { visible: boolean; onClose: () => void; onBusy?: (busy: boolean) => void };

/** Sign-out choice: remove this account's data from the phone (default), or keep the prompts here. */
export function SignOutSheet({ visible, onClose, onBusy }: Props) {
  const signOut = useSignOut();
  const toast = useToast();

  const run = async (erase: boolean) => {
    onBusy?.(true);
    try {
      await signOut(erase);
      router.replace('/');
      toast(erase ? 'Signed out. This phone no longer has your prompts.' : 'Signed out. Your prompts are still on this phone.');
    } catch (e) {
      toast(`Couldn't sign out: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      onBusy?.(false);
    }
  };

  return (
    <ActionSheet
      visible={visible}
      title="Sign out? Your prompts stay safe in your account. Any unsynced changes are uploaded first."
      onClose={onClose}
      actions={[
        { label: 'Sign out and remove my data from this phone', icon: 'trash-outline', destructive: true, onPress: () => run(true) },
        { label: 'Sign out, keep my prompts on this phone', icon: 'log-out-outline', onPress: () => run(false) },
      ]}
    />
  );
}
