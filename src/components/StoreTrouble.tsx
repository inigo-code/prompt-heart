import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { LONG_TOAST_MS, useToast } from '@/components/Toast';
import { font, useTheme } from '@/lib/theme';
import { useAppLock } from '@/lock/AppLockProvider';
import { useSettings } from '@/settings/SettingsProvider';
import { usePromptStore } from '@/store/PromptStore';

/**
 * Tells you when the phone's storage lets the app down: a full screen when the saved prompts can't be
 * read (instead of showing the samples as if they were yours), one toast when saving starts failing, and
 * one when the settings can't be read (which is why App lock is on).
 */
export function StoreTrouble() {
  const { loadFailed, retryLoad, saveFailures } = usePromptStore();
  const { loadFailed: settingsFailed } = useSettings();
  const { locked } = useAppLock();
  const toast = useToast();

  const shown = useRef(saveFailures);
  useEffect(() => {
    if (saveFailures === shown.current) return;
    shown.current = saveFailures;
    toast("Couldn't save your changes on this phone", undefined, LONG_TOAST_MS);
  }, [saveFailures, toast]);

  // Once unlocked, since the lock screen would hide it.
  const toldSettings = useRef(false);
  useEffect(() => {
    if (!settingsFailed || locked || toldSettings.current) return;
    toldSettings.current = true;
    toast("Couldn't read your settings, so App lock is on. Restart the app to try again.", undefined, LONG_TOAST_MS);
  }, [settingsFailed, locked, toast]);

  return loadFailed ? <Unreadable retry={retryLoad} /> : null;
}

function Unreadable({ retry }: { retry: () => Promise<void> }) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [tries, setTries] = useState(0);

  const tryAgain = async () => {
    setBusy(true);
    try {
      await retry();
    } finally {
      setBusy(false);
      setTries((n) => n + 1);
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.screen, { backgroundColor: theme.bg }]} accessibilityViewIsModal>
      <View style={[styles.icon, { backgroundColor: theme.chip }]}>
        <Ionicons name="alert-circle-outline" size={32} color={theme.text} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          Couldn&apos;t open your prompts
        </Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          The phone didn&apos;t let Prompt Heart read its saved data. Nothing has been changed or deleted.
        </Text>
      </View>
      <Pressable
        onPress={() => void tryAgain()}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}
      >
        {busy ? <ActivityIndicator size="small" color={theme.accentText} /> : <Ionicons name="refresh" size={18} color={theme.accentText} />}
        <Text style={[styles.buttonText, { color: theme.accentText }]}>Try again</Text>
      </Pressable>
      {tries > 0 && !busy && (
        <Text style={[styles.body, { color: theme.textMuted }]} accessibilityLiveRegion="polite">
          Still no luck. Close the app fully and open it again, or restart your phone.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  texts: { alignItems: 'center', gap: 6 },
  title: { fontSize: font.title, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: font.body, textAlign: 'center', lineHeight: 22 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 28, borderRadius: 24, marginTop: 8 },
  buttonText: { fontSize: font.headline, fontWeight: '700' },
});
