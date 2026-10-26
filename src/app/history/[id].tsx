import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/Toast';
import { useTheme } from '@/lib/theme';
import { useHistory } from '@/store/HistoryProvider';
import type { Version } from '@/store/HistoryProvider';
import { usePromptStore } from '@/store/PromptStore';

const when = (at: number) =>
  new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Earlier versions of one prompt: tap to preview, then copy or restore. */
export default function HistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { getPrompt } = usePromptStore();
  const history = useHistory();
  const prompt = getPrompt(id);
  const versions = history.versionsFor(id);
  const [open, setOpen] = useState<number | null>(versions[0]?.at ?? null);

  const restore = (v: Version) => {
    history.restore(id, v);
    toast(`Restored the version from ${when(v.at)}`);
    if (router.canGoBack()) router.back();
  };

  return (
    <FlatList
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      data={versions}
      keyExtractor={(v) => String(v.at)}
      ListHeaderComponent={
        <View style={[styles.current, { backgroundColor: theme.accentSoft, borderColor: theme.accent + '55' }]}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Current</Text>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {prompt?.title || 'Untitled'}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {versions.length
              ? `${versions.length} earlier version${versions.length === 1 ? '' : 's'} saved on this device`
              : 'No earlier versions yet'}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={36} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            A version is saved each time you start editing this prompt, so you can always go back.
          </Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const expanded = open === item.at;
        return (
          <Pressable
            onPress={() => setOpen(expanded ? null : item.at)}
            style={[styles.card, { backgroundColor: theme.card, borderColor: expanded ? theme.accent : theme.border }]}
          >
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: index === 0 ? theme.accent : theme.textMuted }]} />
              <Text style={[styles.time, { color: theme.text }]}>{when(item.at)}</Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
            </View>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={expanded ? undefined : 1}>
              {item.title || 'Untitled'}
            </Text>
            <Text style={[styles.body, { color: theme.textMuted }]} numberOfLines={expanded ? undefined : 2}>
              {item.body}
            </Text>
            {expanded && (
              <View style={styles.actions}>
                <Pressable
                  onPress={async () => {
                    await Clipboard.setStringAsync(item.body);
                    toast('Copied this version');
                  }}
                  style={[styles.btn, { backgroundColor: theme.chip }]}
                >
                  <Ionicons name="copy-outline" size={16} color={theme.text} />
                  <Text style={[styles.btnText, { color: theme.text }]}>Copy</Text>
                </Pressable>
                <Pressable onPress={() => restore(item)} style={[styles.btn, styles.primary, { backgroundColor: theme.accent }]}>
                  <Ionicons name="arrow-undo-outline" size={16} color={theme.accentText} />
                  <Text style={[styles.btnText, { color: theme.accentText }]}>Restore this version</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  current: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 3, marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  meta: { fontSize: 12 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  time: { flex: 1, fontSize: 13, fontWeight: '700' },
  title: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: 12 },
  primary: { flex: 1, justifyContent: 'center' },
  btnText: { fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 10, paddingTop: 50, paddingHorizontal: 24 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
