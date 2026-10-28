import Ionicons from '@expo/vector-icons/Ionicons';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { HeartMark } from '@/components/BrandTitle';
import { APP_NAME, WHATS_NEW } from '@/lib/app';
import { useAppLock } from '@/lock/AppLockProvider';
import { font, useTheme } from '@/lib/theme';
import { useSettings } from '@/settings/SettingsProvider';

// Only real builds receive over-the-air updates; dev, Expo Go and web don't.
const enabled = Updates.isEnabled && !__DEV__;

/**
 * Pops up when an over-the-air update has finished downloading, and once after it's installed with
 * what's new. Updates are checked on launch (expo-updates does that itself) and again whenever the app
 * comes back to the foreground.
 */
export function UpdatePrompt() {
  // Builds without over-the-air updates (dev, web) still show what's new after an APK upgrade.
  if (!enabled) return <NewsGate pending={false} />;
  return <UpdatePromptInner />;
}

/**
 * Shows What's new once after an update: over the air, or a newer APK installed over this one. A fresh
 * install (no saved settings) marks it as seen, so the card only ever follows an update. It waits while
 * the app is locked, and while a downloaded update is waiting for a restart (that one brings the news).
 */
function NewsGate({ pending }: { pending: boolean }) {
  const { settings, ready, firstRun, update } = useSettings();
  const { locked } = useAppLock();
  useEffect(() => {
    if (ready && firstRun && settings.seenUpdate !== WHATS_NEW.id) update({ seenUpdate: WHATS_NEW.id });
  }, [ready, firstRun, settings.seenUpdate, update]);
  if (!ready || locked || firstRun || pending || settings.seenUpdate === WHATS_NEW.id) return null;
  return <WhatsNew onClose={() => update({ seenUpdate: WHATS_NEW.id })} />;
}

function UpdatePromptInner() {
  const theme = useTheme();
  // Nothing pops up over the lock screen; the cards wait until the app is open.
  const { locked } = useAppLock();
  const { isUpdatePending, isUpdateAvailable, isDownloading } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  const [restarting, setRestarting] = useState(false);

  // Check again on resume, and download anything found so the pop-up can offer it.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      Updates.checkForUpdateAsync()
        .then((r) => (r.isAvailable ? Updates.fetchUpdateAsync() : undefined))
        .then(() => setDismissed(false))
        .catch(() => {});
    });
    return () => sub.remove();
  }, []);

  // Found at launch but not downloaded yet: fetch it.
  useEffect(() => {
    if (isUpdateAvailable && !isUpdatePending && !isDownloading) Updates.fetchUpdateAsync().catch(() => {});
  }, [isUpdateAvailable, isUpdatePending, isDownloading]);

  const visible = isUpdatePending && !dismissed && !locked;

  return (
    <>
    <NewsGate pending={isUpdatePending} />
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setDismissed(true)}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <HeartMark theme={theme} size={64} />
          <Text style={[styles.title, { color: theme.text }]}>A fresh update is ready</Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            {APP_NAME} has downloaded improvements and fixes. Restart to start using them. It only takes a second, and your
            prompts are safe.
          </Text>
          <Pressable
            onPress={() => {
              setRestarting(true);
              Updates.reloadAsync().catch(() => setRestarting(false));
            }}
            style={[styles.primary, { backgroundColor: theme.accent }]}
            accessibilityRole="button"
          >
            {restarting ? <ActivityIndicator color={theme.accentText} /> : <Text style={[styles.primaryText, { color: theme.accentText }]}>Restart now</Text>}
          </Pressable>
          <Pressable onPress={() => setDismissed(true)} style={styles.secondary} accessibilityRole="button">
            <Text style={[styles.secondaryText, { color: theme.textMuted }]}>Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    </>
  );
}

/** The card shown once after an update: what changed, in a few lines. */
export function WhatsNew({ onClose }: { onClose: () => void }) {
  const theme = useTheme();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} accessibilityViewIsModal>
          <View style={[styles.badge, { backgroundColor: theme.accentSoft }]}>
            <Ionicons name="sparkles" size={26} color={theme.accent} />
          </View>
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            What’s new in {APP_NAME}
          </Text>
          <View style={styles.list}>
            {WHATS_NEW.items.map((item) => (
              <View key={item} style={styles.item}>
                <View style={[styles.dot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.itemText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
            accessibilityRole="button"
          >
            <Text style={[styles.primaryText, { color: theme.accentText }]}>Got it</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 380, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 24, alignItems: 'center', gap: 10 },
  title: { fontSize: font.title, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  body: { fontSize: font.body, lineHeight: 20, textAlign: 'center' },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  list: { alignSelf: 'stretch', gap: 12, marginTop: 6 },
  item: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  itemText: { flex: 1, fontSize: font.body, lineHeight: 21 },
  primary: { alignSelf: 'stretch', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryText: { fontSize: font.headline, fontWeight: '800' },
  secondary: { paddingVertical: 8, paddingHorizontal: 20 },
  secondaryText: { fontSize: font.body, fontWeight: '700' },
});
