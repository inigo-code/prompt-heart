import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Theme } from '@/lib/theme';
import type { Folder, Prompt } from '@/store/types';

type Props = {
  prompt: Prompt;
  folder?: Folder;
  theme: Theme;
  onOpen: (prompt: Prompt) => void;
  onCopy: (prompt: Prompt) => void;
  onLongPress: (prompt: Prompt) => void;
};

export const PromptCard = memo(function PromptCard({ prompt, folder, theme, onOpen, onCopy, onLongPress }: Props) {
  return (
    <Pressable
      onPress={() => onOpen(prompt)}
      onLongPress={() => onLongPress(prompt)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: prompt.pinned ? theme.cardPinned : theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {prompt.pinned && <Ionicons name="pin" size={14} color={theme.accent} style={styles.pin} />}
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {prompt.title || 'Untitled'}
          </Text>
        </View>
        <Pressable
          onPress={() => onCopy(prompt)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Copy ${prompt.title}`}
          style={({ pressed }) => [styles.copyBtn, { backgroundColor: pressed ? theme.accent : theme.chip }]}
        >
          <Ionicons name="copy-outline" size={18} color={theme.text} />
        </Pressable>
      </View>

      <Text style={[styles.body, { color: theme.textMuted }]} numberOfLines={4}>
        {prompt.body}
      </Text>

      {(folder || prompt.tags.length > 0) && (
        <View style={styles.meta}>
          {folder && (
            <View style={[styles.folder, { backgroundColor: folder.color + '33' }]}>
              <View style={[styles.dot, { backgroundColor: folder.color }]} />
              <Text style={[styles.metaText, { color: theme.text }]}>{folder.name}</Text>
            </View>
          )}
          {prompt.tags.map((t) => (
            <Text key={t} style={[styles.metaText, { color: theme.textMuted }]}>
              #{t}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  pin: { marginRight: 6 },
  title: { flex: 1, fontSize: 16, fontWeight: '700' },
  copyBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  folder: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
});
