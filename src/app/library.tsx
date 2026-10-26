import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { useToast } from '@/components/Toast';
import { LIBRARY_CATEGORIES, LIBRARY_PROMPTS } from '@/library/prompts';
import type { LibraryCategory, LibraryPrompt } from '@/library/prompts';
import { extractVariables } from '@/lib/templates';
import { useTheme } from '@/lib/theme';
import type { Theme } from '@/lib/theme';
import { useCopyPrompt } from '@/lib/useCopyPrompt';
import { usePromptStore } from '@/store/PromptStore';
import type { Prompt } from '@/store/types';

const CATEGORY: Record<string, LibraryCategory> = Object.fromEntries(LIBRARY_CATEGORIES.map((c) => [c.key, c]));

/** A library entry shaped like a prompt, for the copy flow (fill-in sheet, clipboard). It isn't stored. */
const asPrompt = (p: LibraryPrompt): Prompt => ({
  id: `library:${p.id}`,
  title: p.title,
  body: p.body,
  folderId: null,
  tags: [],
  pinned: false,
  images: [],
  copyCount: 0,
  createdAt: 0,
  updatedAt: 0,
  lastCopiedAt: null,
  modifiedAt: 0,
  deletedAt: null,
});

export default function LibraryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const copy = useCopyPrompt();
  const { prompts, createPrompt } = usePromptStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // A library prompt counts as saved while one of your prompts has the same text.
  const savedBodies = useMemo(() => new Set(prompts.map((p) => p.body.trim())), [prompts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LIBRARY_PROMPTS.filter(
      (p) =>
        (!category || p.category === category) &&
        (!q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q) || CATEGORY[p.category].label.toLowerCase().includes(q)),
    );
  }, [query, category]);

  const save = useCallback(
    (p: LibraryPrompt) => {
      const created = createPrompt({ title: p.title, body: p.body, tags: [CATEGORY[p.category].tag] });
      toast('Saved to your prompts', {
        label: 'Edit',
        onPress: () => router.push({ pathname: '/prompt/[id]', params: { id: created.id } }),
      });
    },
    [createPrompt, toast],
  );
  const copyItem = useCallback((p: LibraryPrompt) => copy(asPrompt(p)), [copy]);
  const toggle = useCallback((id: string) => setExpanded((cur) => (cur === id ? null : id)), []);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.top}>
        <View style={[styles.search, { backgroundColor: theme.chip }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${LIBRARY_PROMPTS.length} ready-made prompts`}
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" active={category === null} theme={theme} accessibilityLabel="Show all library prompts" onPress={() => setCategory(null)} />
          {LIBRARY_CATEGORIES.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              active={category === c.key}
              leading={<CategoryIcon category={c} />}
              theme={theme}
              accessibilityLabel={`Show ${c.label} prompts`}
              onPress={() => setCategory(category === c.key ? null : c.key)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Text style={[styles.intro, { color: theme.textMuted }]}>
            Tap <Text style={{ fontWeight: '800', color: theme.text }}>Copy</Text> to use one now, or{' '}
            <Text style={{ fontWeight: '800', color: theme.text }}>Save</Text> it to your prompts to edit and keep it.
          </Text>
        }
        renderItem={({ item }) => (
          <LibraryCard
            item={item}
            theme={theme}
            saved={savedBodies.has(item.body.trim())}
            expanded={expanded === item.id}
            onToggle={toggle}
            onCopy={copyItem}
            onSave={save}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search" size={28} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No library prompts match. Try another word or category.</Text>
          </View>
        }
      />
    </View>
  );
}

function CategoryIcon({ category, size = 24 }: { category: LibraryCategory; size?: number }) {
  return (
    <View style={[styles.catIcon, { width: size, height: size, borderRadius: size / 2, backgroundColor: category.color + '33' }]}>
      <Ionicons name={category.icon} size={Math.round(size * 0.55)} color={category.color} />
    </View>
  );
}

const LibraryCard = memo(function LibraryCard({
  item,
  theme,
  saved,
  expanded,
  onToggle,
  onCopy,
  onSave,
}: {
  item: LibraryPrompt;
  theme: Theme;
  saved: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
  onCopy: (p: LibraryPrompt) => void;
  onSave: (p: LibraryPrompt) => void;
}) {
  const category = CATEGORY[item.category];
  const blanks = extractVariables(item.body).length;

  return (
    <Pressable
      onPress={() => onToggle(item.id)}
      accessibilityHint={expanded ? 'Shows less of the prompt' : 'Shows the whole prompt'}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <View style={[styles.categoryBar, { backgroundColor: category.color }]} />
      <View style={styles.meta}>
        <View style={[styles.pill, { backgroundColor: category.color + '24' }]}>
          <Ionicons name={category.icon} size={12} color={category.color} />
          <Text style={[styles.metaText, { color: theme.text }]}>{category.label}</Text>
        </View>
        {blanks > 0 && (
          <View style={[styles.pill, { backgroundColor: theme.chip }]}>
            <Ionicons name="code-slash" size={11} color={theme.textMuted} />
            <Text style={[styles.metaText, { color: theme.textMuted }]}>
              {blanks} {blanks === 1 ? 'blank' : 'blanks'} to fill
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
      <Text style={[styles.body, { color: theme.textMuted }]} numberOfLines={expanded ? undefined : 3}>
        {item.body}
      </Text>
      <View style={styles.actions}>
        <Pressable
          onPress={() => onCopy(item)}
          accessibilityRole="button"
          accessibilityLabel={`Copy ${item.title}`}
          style={({ pressed }) => [styles.btn, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Ionicons name="copy-outline" size={15} color={theme.accentText} />
          <Text style={[styles.btnText, { color: theme.accentText }]}>Copy</Text>
        </Pressable>
        <Pressable
          onPress={() => onSave(item)}
          disabled={saved}
          accessibilityRole="button"
          accessibilityLabel={saved ? `${item.title} is saved to your prompts` : `Save ${item.title} to your prompts`}
          accessibilityState={{ disabled: saved }}
          style={({ pressed }) => [
            styles.btn,
            styles.btnOutline,
            { borderColor: saved ? theme.border : theme.accent, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name={saved ? 'checkmark-circle' : 'bookmark-outline'} size={15} color={saved ? theme.textMuted : theme.text} />
          <Text style={[styles.btnText, { color: saved ? theme.textMuted : theme.text }]}>{saved ? 'Saved' : 'Save'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { paddingHorizontal: 16, paddingTop: 10 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 44, borderRadius: 14 },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  chips: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  catIcon: { alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 6, gap: 12 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 2 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 14, paddingLeft: 16, gap: 8, overflow: 'hidden' },
  categoryBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  metaText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 16, borderRadius: 18 },
  btnOutline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  btnText: { fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
