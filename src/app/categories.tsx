import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/AppText';
import { ActionSheet } from '@/components/ActionSheet';
import { font, useTheme } from '@/lib/theme';
import { useVisibleFolders } from '@/lib/useAiApps';
import { FOLDER_COLORS, usePromptStore } from '@/store/PromptStore';
import type { Folder } from '@/store/types';

export default function CategoriesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Opened from "+ New category": put the cursor straight in the name box.
  const { new: startNew } = useLocalSearchParams<{ new?: string }>();
  const { prompts, createFolder, updateFolder, deleteFolder } = usePromptStore();
  const folders = useVisibleFolders();

  const [name, setName] = useState('');
  // Colours aren't shown any more, but every category still has one (it syncs, and older versions show it).
  const color = FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
  const [editing, setEditing] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [menuFor, setMenuFor] = useState<Folder | null>(null);
  // Deleting a category has no undo, so it asks first.
  const [deleting, setDeleting] = useState<Folder | null>(null);

  const startRename = (f: Folder) => {
    setRenameText(f.name);
    setEditing(f.id);
  };

  // Called on both submit and blur; onEndEditing isn't reliable on web.
  const finishRename = () => {
    const v = renameText.trim();
    const current = folders.find((f) => f.id === editing);
    if (current && v && v !== current.name) updateFolder(current.id, { name: v });
    setEditing(null);
  };

  const add = () => {
    if (!name.trim()) return;
    createFolder(name, color);
    setName('');
  };

  const countFor = (id: string) => prompts.filter((p) => p.folderId === id).length;

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={[styles.newBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          placeholder="New category name"
          autoFocus={startNew === '1'}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
        />
        <Pressable
          onPress={add}
          disabled={!name.trim()}
          style={[styles.addBtn, { backgroundColor: theme.accent, opacity: name.trim() ? 1 : 0.5 }]}
        >
          <Text style={[styles.addText, { color: theme.accentText }]}>Add category</Text>
        </Pressable>
      </View>

      <FlatList
        data={folders}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.row,
              { backgroundColor: theme.card, borderColor: theme.border },
              index === 0 && styles.first,
              index === folders.length - 1 ? styles.last : { borderBottomWidth: StyleSheet.hairlineWidth },
            ]}
          >
            {editing === item.id ? (
              <TextInput
                value={renameText}
                onChangeText={setRenameText}
                autoFocus
                selectTextOnFocus
                onSubmitEditing={finishRename}
                onBlur={finishRename}
                style={[styles.rowName, { color: theme.text }]}
              />
            ) : (
              <Text style={[styles.rowName, { color: theme.text }]} onPress={() => startRename(item)}>
                {item.name}
              </Text>
            )}
            <Text style={[styles.countText, { color: theme.textMuted }]} accessibilityLabel={`${countFor(item.id)} prompts`}>
              {countFor(item.id)}
            </Text>
            <Pressable style={styles.more} onPress={() => setMenuFor(item)} accessibilityLabel={`Options for ${item.name}`}>
              <Ionicons name="ellipsis-horizontal" size={20} color={theme.textMuted} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.textMuted }]}>No categories yet.</Text>}
        ListFooterComponent={
          folders.length > 0 ? (
            <Text style={[styles.hint, { color: theme.textMuted }]}>Tap a name to rename it.</Text>
          ) : undefined
        }
      />

      <ActionSheet
        visible={menuFor !== null}
        title={menuFor ? `${menuFor.name} — prompts will be kept as uncategorised` : undefined}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                { label: 'Rename', icon: 'create-outline', onPress: () => startRename(menuFor) },
                { label: 'Delete category', icon: 'trash-outline', destructive: true, onPress: () => setDeleting(menuFor) },
              ]
            : []
        }
      />

      <ActionSheet
        visible={deleting !== null}
        title={
          deleting
            ? `Delete the category “${deleting.name}”? ${
                countFor(deleting.id) === 0
                  ? 'It has no prompts.'
                  : `Its ${countFor(deleting.id) === 1 ? 'prompt stays' : `${countFor(deleting.id)} prompts stay`}, uncategorised.`
              } This can't be undone.`
            : undefined
        }
        onClose={() => setDeleting(null)}
        actions={deleting ? [{ label: 'Delete category', icon: 'trash-outline', destructive: true, onPress: () => deleteFolder(deleting.id) }] : []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  newBox: { margin: 16, padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  input: { fontSize: font.headline, paddingVertical: 4 },
  addBtn: { height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: font.body, fontWeight: '700' },
  // Rows form one grouped card: outer edges and rounded corners on the first and last row, dividers between.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 56,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  first: { borderTopWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  last: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  countText: { fontSize: font.body, fontVariant: ['tabular-nums'] },
  more: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  rowName: { flex: 1, fontSize: font.headline, fontWeight: '600' },
  empty: { textAlign: 'center', paddingTop: 40 },
  hint: { textAlign: 'center', fontSize: font.caption, paddingTop: 12 },
});
