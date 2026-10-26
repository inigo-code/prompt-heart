import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ActionSheet';
import { Chip } from '@/components/Chip';
import { PromptCard } from '@/components/PromptCard';
import { useTheme } from '@/lib/theme';
import { useCopyPrompt } from '@/lib/useCopyPrompt';
import { usePromptStore } from '@/store/PromptStore';
import { useSync } from '@/sync/SyncProvider';
import type { Prompt } from '@/store/types';

type Filter = { kind: 'all' } | { kind: 'pinned' } | { kind: 'folder'; id: string } | { kind: 'tag'; tag: string };
type Sort = 'recent' | 'most-used';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, prompts, folders, allTags, getFolder, togglePin, duplicatePrompt, deletePrompt } = usePromptStore();
  const copy = useCopyPrompt();
  const { status: syncStatus } = useSync();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const [sort, setSort] = useState<Sort>('recent');
  const [menuFor, setMenuFor] = useState<Prompt | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prompts
      .filter((p) => {
        if (filter.kind === 'pinned' && !p.pinned) return false;
        if (filter.kind === 'folder' && p.folderId !== filter.id) return false;
        if (filter.kind === 'tag' && !p.tags.includes(filter.tag)) return false;
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q.replace(/^#/, '')))
        );
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return sort === 'recent' ? b.updatedAt - a.updatedAt : b.copyCount - a.copyCount;
      });
  }, [prompts, query, filter, sort]);

  const openPrompt = useCallback((p: Prompt) => router.push({ pathname: '/prompt/[id]', params: { id: p.id } }), []);
  const isActive = (f: Filter) => JSON.stringify(f) === JSON.stringify(filter);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                hitSlop={8}
                accessibilityLabel="Toggle sort"
                onPress={() => setSort((s) => (s === 'recent' ? 'most-used' : 'recent'))}
              >
                <Ionicons name={sort === 'recent' ? 'time-outline' : 'flame-outline'} size={22} color={theme.text} />
              </Pressable>
              <Pressable hitSlop={8} accessibilityLabel="Cloud sync" onPress={() => router.push('/account')}>
                <Ionicons
                  name={
                    syncStatus === 'synced'
                      ? 'cloud-done-outline'
                      : syncStatus === 'syncing'
                        ? 'sync'
                        : syncStatus === 'error' || syncStatus === 'signed-out' || syncStatus === 'unconfigured'
                          ? 'cloud-offline-outline'
                          : 'cloud-outline'
                  }
                  size={22}
                  color={syncStatus === 'error' ? theme.danger : theme.text}
                />
              </Pressable>
              <Pressable hitSlop={8} accessibilityLabel="Manage categories" onPress={() => router.push('/categories')}>
                <Ionicons name="folder-open-outline" size={22} color={theme.text} />
              </Pressable>
            </View>
          ),
        }}
      />

      <View style={[styles.search, { backgroundColor: theme.chip }]}>
        <Ionicons name="search" size={18} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search prompts or #tags"
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.text }]}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" theme={theme} active={isActive({ kind: 'all' })} onPress={() => setFilter({ kind: 'all' })} />
          <Chip label="Pinned" theme={theme} active={isActive({ kind: 'pinned' })} onPress={() => setFilter({ kind: 'pinned' })} />
          {folders.map((f) => (
            <Chip
              key={f.id}
              label={f.name}
              color={f.color}
              theme={theme}
              active={isActive({ kind: 'folder', id: f.id })}
              onPress={() => setFilter({ kind: 'folder', id: f.id })}
            />
          ))}
          {allTags.map((t) => (
            <Chip
              key={t}
              label={`#${t}`}
              theme={theme}
              active={isActive({ kind: 'tag', tag: t })}
              onPress={() => setFilter({ kind: 'tag', tag: t })}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <PromptCard
            prompt={item}
            folder={getFolder(item.folderId)}
            theme={theme}
            onOpen={openPrompt}
            onCopy={copy}
            onLongPress={setMenuFor}
          />
        )}
        ListEmptyComponent={
          ready ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {query || filter.kind !== 'all' ? 'No prompts match.' : 'No prompts yet. Tap + to add one.'}
              </Text>
            </View>
          ) : undefined
        }
      />

      <Pressable
        accessibilityLabel="New prompt"
        onPress={() => {
          const folderId = filter.kind === 'folder' ? filter.id : undefined;
          router.push({ pathname: '/prompt/[id]', params: { id: 'new', ...(folderId ? { folderId } : {}) } });
        }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent, bottom: insets.bottom + 24, transform: [{ scale: pressed ? 0.95 : 1 }] },
        ]}
      >
        <Ionicons name="add" size={30} color={theme.accentText} />
      </Pressable>

      <ActionSheet
        visible={menuFor !== null}
        title={menuFor?.title}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                { label: 'Copy', onPress: () => copy(menuFor) },
                { label: menuFor.pinned ? 'Unpin' : 'Pin to top', onPress: () => togglePin(menuFor.id) },
                { label: 'Duplicate', onPress: () => duplicatePrompt(menuFor.id) },
                { label: 'Delete', destructive: true, onPress: () => deletePrompt(menuFor.id) },
              ]
            : []
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 18, paddingHorizontal: 4 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  chips: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  list: { paddingHorizontal: 16, gap: 12 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 80 },
  emptyText: { fontSize: 15 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
