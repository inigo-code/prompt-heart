import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ActionSheet';
import { AppBadge } from '@/components/AppBadge';
import { Chip } from '@/components/Chip';
import { PromptCard } from '@/components/PromptCard';
import { useToast } from '@/components/Toast';
import { aiAppForFolder } from '@/lib/ai';
import type { AiApp } from '@/lib/ai';
import { APP_NAME } from '@/lib/app';
import { useTheme } from '@/lib/theme';
import { useEnabledAiApps, useVisibleFolders } from '@/lib/useAiApps';
import { useCopyPrompt } from '@/lib/useCopyPrompt';
import { useSettings } from '@/settings/SettingsProvider';
import type { SortKey } from '@/settings/SettingsProvider';
import { usePromptStore } from '@/store/PromptStore';
import type { Prompt } from '@/store/types';
import { useSync } from '@/sync/SyncProvider';
import type { SyncStatus } from '@/sync/SyncProvider';

type Filter =
  | { kind: 'all' }
  | { kind: 'pinned' }
  | { kind: 'copied' }
  | { kind: 'folder'; id: string }
  | { kind: 'tag'; tag: string };

const SORTS: Record<SortKey, { label: string; next: SortKey }> = {
  recent: { label: 'Recently edited', next: 'most-used' },
  'most-used': { label: 'Most copied', next: 'title' },
  title: { label: 'A–Z', next: 'recent' },
};

const SYNC_ICON: Record<SyncStatus, keyof typeof Ionicons.glyphMap> = {
  unconfigured: 'cloud-offline-outline',
  'signed-out': 'cloud-offline-outline',
  idle: 'cloud-outline',
  syncing: 'sync',
  synced: 'cloud-done-outline',
  error: 'cloud-offline-outline',
};

const sameFilter = (a: Filter, b: Filter) => JSON.stringify(a) === JSON.stringify(b);

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { settings, update } = useSettings();
  const { ready, prompts, allTags, togglePin, duplicatePrompt, deletePrompt, restorePrompt } = usePromptStore();
  const copy = useCopyPrompt();
  const { status: syncStatus } = useSync();
  const folders = useVisibleFolders();
  const aiApps = useEnabledAiApps();
  const launchAppFor = useCallback(
    (folderId: string | null) => {
      const app = aiAppForFolder(folderId);
      return app && settings.aiApps[app.key] ? app : undefined;
    },
    [settings.aiApps],
  );
  const launch = useCallback((p: Prompt, app: AiApp) => copy(p, { openIn: app }), [copy]);
  // Cards only label categories that are visible (an AI app that's switched off hides its label too).
  const visibleFolder = useCallback((id: string | null) => folders.find((f) => f.id === id), [folders]);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const [menuFor, setMenuFor] = useState<Prompt | null>(null);
  const grid = settings.layout === 'grid';

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '');
    const list = prompts.filter((p) => {
      if (filter.kind === 'pinned' && !p.pinned) return false;
      if (filter.kind === 'copied' && !p.lastCopiedAt) return false;
      if (filter.kind === 'folder' && p.folderId !== filter.id) return false;
      if (filter.kind === 'tag' && !p.tags.includes(filter.tag)) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q));
    });
    if (filter.kind === 'copied') return list.sort((a, b) => (b.lastCopiedAt ?? 0) - (a.lastCopiedAt ?? 0));
    return list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (settings.sort === 'most-used') return b.copyCount - a.copyCount || b.updatedAt - a.updatedAt;
      if (settings.sort === 'title') return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
      return b.updatedAt - a.updatedAt;
    });
  }, [prompts, query, filter, settings.sort]);

  const openPrompt = useCallback((p: Prompt) => router.push({ pathname: '/prompt/[id]', params: { id: p.id } }), []);

  const remove = (p: Prompt) => {
    deletePrompt(p.id);
    toast('Moved to Trash', { label: 'Undo', onPress: () => restorePrompt(p.id) });
  };

  const chip = (label: string, f: Filter, color?: string) => (
    <Chip key={label} label={label} color={color} theme={theme} active={sameFilter(filter, f)} onPress={() => setFilter(f)} />
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.appName, { color: theme.text }]}>{APP_NAME}</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {prompts.length} prompt{prompts.length === 1 ? '' : 's'}
              {folders.length ? ` · ${folders.length} categor${folders.length === 1 ? 'y' : 'ies'}` : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton theme={theme} icon={SYNC_ICON[syncStatus]} label="Cloud sync" tint={syncStatus === 'error' ? theme.danger : undefined} onPress={() => router.push('/account')} />
            <IconButton theme={theme} icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
          </View>
        </View>

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
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {settings.showAiBar && aiApps.length > 0 && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aiBar}>
          {aiApps.map((app) => (
            <Pressable
              key={app.key}
              onPress={() => Linking.openURL(app.home).catch(() => toast(`Couldn't open ${app.label}`))}
              accessibilityLabel={`Open ${app.label}`}
              style={({ pressed }) => [styles.aiPill, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <AppBadge app={app} size={22} />
              <Text style={[styles.aiPillText, { color: theme.text }]}>{app.label}</Text>
            </Pressable>
          ))}
          </ScrollView>
        </View>
      )}

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {chip('All', { kind: 'all' })}
          {chip('Pinned', { kind: 'pinned' })}
          {chip('Recently copied', { kind: 'copied' })}
          {folders.map((f) => chip(f.name, { kind: 'folder', id: f.id }, f.color))}
          {allTags.map((t) => chip(`#${t}`, { kind: 'tag', tag: t }))}
          <Chip label="Edit categories" theme={theme} onPress={() => router.push('/categories')} />
        </ScrollView>
      </View>

      <View style={styles.toolbar}>
        <Pressable
          onPress={() => update({ sort: SORTS[settings.sort].next })}
          disabled={filter.kind === 'copied'}
          style={styles.sortBtn}
          accessibilityLabel="Change sort order"
        >
          <Ionicons name="swap-vertical" size={15} color={theme.textMuted} />
          <Text style={[styles.toolbarText, { color: theme.textMuted }]}>
            {filter.kind === 'copied' ? 'Last copied' : SORTS[settings.sort].label}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => update({ layout: grid ? 'list' : 'grid' })}
          hitSlop={8}
          accessibilityLabel={grid ? 'Show as list' : 'Show as grid'}
        >
          <Ionicons name={grid ? 'list-outline' : 'grid-outline'} size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      <FlatList
        key={settings.layout}
        data={visible}
        numColumns={grid ? 2 : 1}
        keyExtractor={(p) => p.id}
        columnWrapperStyle={grid ? styles.gridRow : undefined}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <PromptCard
            prompt={item}
            folder={visibleFolder(item.folderId)}
            theme={theme}
            variant={settings.layout}
            previewLines={grid ? Math.min(settings.previewLines, 4) : settings.previewLines}
            showTokens={settings.showTokens && !grid}
            launchApp={launchAppFor(item.folderId)}
            onLaunch={launch}
            onOpen={openPrompt}
            onCopy={copy}
            onLongPress={setMenuFor}
          />
        )}
        ListEmptyComponent={
          ready ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
                <Ionicons name={query || filter.kind !== 'all' ? 'search' : 'albums-outline'} size={30} color={theme.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {query || filter.kind !== 'all' ? 'Nothing matches' : 'No prompts yet'}
              </Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                {query || filter.kind !== 'all'
                  ? 'Try a different search or filter.'
                  : 'Tap + to write one, or share text to ' + APP_NAME + ' from any app.'}
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
          { backgroundColor: theme.accent, bottom: insets.bottom + 24, transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}
      >
        <Ionicons name="add" size={30} color={theme.accentText} />
      </Pressable>

      <ActionSheet
        visible={menuFor !== null}
        title={menuFor?.title || 'Untitled'}
        onClose={() => setMenuFor(null)}
        actions={
          menuFor
            ? [
                { label: 'Copy', onPress: () => copy(menuFor) },
                ...aiApps.map((a) => ({ label: `Copy & open in ${a.label}`, onPress: () => copy(menuFor, { openIn: a }) })),
                { label: menuFor.pinned ? 'Unpin' : 'Pin to top', onPress: () => togglePin(menuFor.id) },
                { label: 'Duplicate', onPress: () => duplicatePrompt(menuFor.id) },
                { label: 'Move to Trash', destructive: true, onPress: () => remove(menuFor) },
              ]
            : []
        }
      />
    </View>
  );
}

function IconButton({ theme, icon, label, tint, onPress }: {
  theme: ReturnType<typeof useTheme>;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? theme.chip : 'transparent' }]}
    >
      <Ionicons name={icon} size={22} color={tint ?? theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  top: { paddingHorizontal: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appName: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 44, borderRadius: 14 },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  aiBar: { gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  aiPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 5, paddingRight: 12, height: 34, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth },
  aiPillText: { fontSize: 13, fontWeight: '700' },
  chips: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 6 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  toolbarText: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  gridRow: { gap: 12 },
  empty: { alignItems: 'center', gap: 8, paddingTop: 70, paddingHorizontal: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
});
