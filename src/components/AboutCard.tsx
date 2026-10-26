import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Theme } from '@/lib/theme';

// Updates download on launch and apply on the next restart; this lets you check and apply one right away.
// The update APIs reject in Expo Go and dev builds, so the button only shows in real builds.
const canUpdate = Updates.isEnabled && !__DEV__;

function describeRunning() {
  if (!Updates.isEnabled || __DEV__) return 'Development';
  if (Updates.isEmbeddedLaunch || !Updates.updateId) return 'Built-in version';
  const when = Updates.createdAt ? Updates.createdAt.toLocaleString() : '';
  return `Update ${Updates.updateId.slice(0, 8)}${when ? ` · ${when}` : ''}`;
}

export function AboutCard({ theme }: { theme: Theme }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const check = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        setMessage("You're on the latest version.");
        return;
      }
      setMessage('Downloading update…');
      const fetched = await Updates.fetchUpdateAsync();
      if (fetched.isNew) await Updates.reloadAsync();
      else setMessage("You're on the latest version.");
    } catch (e) {
      setMessage(`Couldn't check for updates: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.textMuted }]}>About</Text>
      <Text style={[styles.line, { color: theme.text }]}>Prompt Notes {Constants.expoConfig?.version ?? ''}</Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>
        {describeRunning()}
        {Updates.channel ? ` · ${Updates.channel}` : ''}
      </Text>
      {canUpdate && (
        <Pressable onPress={check} disabled={busy} style={[styles.btn, { backgroundColor: theme.chip }]}>
          {busy ? <ActivityIndicator color={theme.text} /> : <Text style={[styles.btnText, { color: theme.text }]}>Check for updates</Text>}
        </Pressable>
      )}
      {message && <Text style={[styles.meta, { color: theme.textMuted }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  line: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13 },
  btn: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText: { fontSize: 15, fontWeight: '700' },
});
