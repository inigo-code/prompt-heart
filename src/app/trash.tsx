import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ActionSheet';
import { useToast } from '@/components/Toast';
import { deleteLocalImage } from '@/lib/images';
import { font, useTheme } from '@/lib/theme';
import { TRASH_DAYS, usePromptStore } from '@/store/PromptStore';
import type { Prompt } from '@/store/types';

const DAY = 24 * 60 * 60 * 1000;

export default function TrashScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const router = useRouter();
  const { trash, restorePrompt, purgePrompt, emptyTrash } = usePromptStore();
  const [now] = useState(() => Date.now());
  const [confirm, setConfirm] = useState<{ kind: 'one'; prompt: Prompt } | { kind: 'all' } | null>(null);

  const daysLeft = (p: Prompt) => Math.max(0, Math.ceil(((p.deletedAt ?? 0) + TRASH_DAYS * DAY - now) / DAY));

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Stack.Screen
        options={{
          headerRight: () =>
            trash.length > 0 ? (
              <Pressable onPress={() => setConfirm({ kind: 'all' })} hitSlop={12} accessibilityRole="button" accessibilityLabel="Empty trash">
                <Text style={{ color: theme.danger, fontWeight: '700', fontSize: font.body }}>Empty</Text>
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        data={trash}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ListHeaderComponent={
          trash.length === 0 ? undefined : (
            <Text style={[styles.note, { color: theme.textMuted }]}>
              Deleted prompts stay here for {TRASH_DAYS} days, on every synced device.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {item.title || 'Untitled'}
              </Text>
              <Text style={[styles.body, { color: theme.textMuted }]} numberOfLines={2}>
                {item.body || (item.images.length ? `${item.images.length} image(s)` : '')}
              </Text>
              <Text style={[styles.days, { color: theme.textMuted }]}>{daysLeft(item)} days left</Text>
            </View>
            <Pressable
              onPress={() => {
                restorePrompt(item.id);
                toast('Restored');
              }}
              style={[styles.btn, { backgroundColor: theme.accentSoft }]}
              accessibilityLabel={`Restore ${item.title}`}
            >
              <Ionicons name="arrow-undo-outline" size={18} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => setConfirm({ kind: 'one', prompt: item })}
              style={[styles.btn, { backgroundColor: theme.danger + '1F' }]}
              accessibilityLabel={`Delete ${item.title} forever`}
            >
              <Ionicons name="close" size={18} color={theme.danger} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name="trash-outline" size={32} color={theme.text} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Trash is empty</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Prompts you delete wait here for {TRASH_DAYS} days, so you can bring them back.
            </Text>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              style={({ pressed }) => [styles.emptyBtn, { backgroundColor: theme.chip, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.emptyBtnText, { color: theme.text }]}>Back to prompts</Text>
            </Pressable>
          </View>
        }
      />

      <ActionSheet
        visible={confirm !== null}
        title={confirm?.kind === 'all' ? `Delete all ${trash.length} prompts forever? This can't be undone.` : "Delete forever? This can't be undone."}
        onClose={() => setConfirm(null)}
        actions={[
          {
            label: 'Delete forever',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => {
              const orphans = confirm?.kind === 'all' ? emptyTrash() : confirm ? purgePrompt(confirm.prompt.id) : [];
              orphans.forEach(deleteLocalImage);
            },
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16, gap: 10 },
  note: { fontSize: font.footnote, marginBottom: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  title: { fontSize: font.body, fontWeight: '700' },
  body: { fontSize: font.footnote, lineHeight: 18 },
  days: { fontSize: font.caption, fontWeight: '600', marginTop: 2 },
  btn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingTop: 96, paddingHorizontal: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: font.headline, fontWeight: '700' },
  emptyText: { fontSize: font.body, lineHeight: 21, textAlign: 'center', maxWidth: 300 },
  emptyBtn: { marginTop: 12, height: 44, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { fontSize: font.body, fontWeight: '700' },
});
