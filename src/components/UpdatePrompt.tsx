import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { HeartMark } from '@/components/BrandTitle';
import { APP_NAME } from '@/lib/app';
import { font, useTheme } from '@/lib/theme';

// Only real builds receive over-the-air updates; dev, Expo Go and web don't.
const enabled = Updates.isEnabled && !__DEV__;

/**
 * Pops up when an over-the-air update has finished downloading. Updates are checked on launch
 * (expo-updates does that itself) and again whenever the app comes back to the foreground.
 */
export function UpdatePrompt() {
  if (!enabled) return null;
  return <UpdatePromptInner />;
}

function UpdatePromptInner() {
  const theme = useTheme();
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

  const visible = isUpdatePending && !dismissed;

  return (
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
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { width: '100%', maxWidth: 380, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 24, alignItems: 'center', gap: 10 },
  title: { fontSize: font.title, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  body: { fontSize: font.body, lineHeight: 20, textAlign: 'center' },
  primary: { alignSelf: 'stretch', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryText: { fontSize: font.headline, fontWeight: '800' },
  secondary: { paddingVertical: 8, paddingHorizontal: 20 },
  secondaryText: { fontSize: font.body, fontWeight: '700' },
});
