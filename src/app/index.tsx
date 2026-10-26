import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, BackHandler, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ActionSheet';
import { AppBadge } from '@/components/AppBadge';
import { Avatar } from '@/components/Avatar';
import { BrandTitle, HeartMark } from '@/components/BrandTitle';
import { Chip } from '@/components/Chip';
import { PromptCard } from '@/components/PromptCard';
import { TagSheet } from '@/components/TagSheet';
import { TipCard } from '@/components/TipCard';
import { useToast } from '@/components/Toast';
import { aiAppForFolder } from '@/lib/ai';
import type { AiApp } from '@/lib/ai';
import { APP_NAME } from '@/lib/app';
import { greeting, useHour } from '@/lib/greeting';
import { useTheme } from '@/lib/theme';
import { openAiApp } from '@/lib/launch';
import { useEnabledAiApps, useVisibleFolders } from '@/lib/useAiApps';
import { useCopyPrompt } from '@/lib/useCopyPrompt';
import { LIBRARY_PROMPTS } from '@/library/prompts';
import { useProfile } from '@/profile/ProfileProvider';
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

const SYNC_LABEL: Record<SyncStatus, string> = {
  unconfigured: 'sync not set up',
  'signed-out': 'signed out',
  idle: 'sync on',
  syncing: 'syncing',
  waiting: 'changes waiting',
  synced: 'up to date',
  error: 'sync problem',
};

/** Avatar dot: green synced, amber in progress, amber ring for changes waiting, red problem, none when signed out. */
const syncDot = (status: SyncStatus, theme: ReturnType<typeof useTheme>) =>
  status === 'synced'
    ? '#3FB27F'
    : status === 'syncing' || status === 'idle' || status === 'waiting'
      ? theme.accent
      : status === 'error'
        ? theme.danger
        : undefined;

const sameFilter = (a: Filter, b: Filter) => JSON.stringify(a) === JSON.stringify(b);

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { settings, update } = useSettings();
  const { ready, prompts, allTags, togglePin, duplicatePrompt, deletePrompt, restorePrompt, movePrompts, tagPrompts, setPinned, deletePrompts, restorePrompts } =
    usePromptStore();
  const copy = useCopyPrompt();
  const { status: syncStatus, syncNow, progress } = useSync();
  const [pulling, setPulling] = useState(false);
  const profile = useProfile();
  const hour = useHour();
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
  // Multi-select: null when off, otherwise the selected prompt ids.
  const [selected, setSelected] = useState<string[] | null>(null);
  const [bulkSheet, setBulkSheet] = useState<'move' | 'tag' | null>(null);
  const selecting = selected !== null;
  const count = selected?.length ?? 0;
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

  const canSync = syncStatus !== 'unconfigured' && syncStatus !== 'signed-out';
  const sync = async (fromPull: boolean) => {
    if (!canSync) {
      toast('Sign in to sync your prompts across devices', { label: 'Sign in', onPress: () => router.push('/account') });
      return;
    }
    if (fromPull) setPulling(true);
    try {
      await syncNow();
    } finally {
      if (fromPull) setPulling(false);
    }
  };

  const toggleSelected = useCallback(
    (p: Prompt) => setSelected((cur) => (cur ? (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id]) : [p.id])),
    [],
  );
  const exitSelect = useCallback(() => {
    setSelected(null);
    setBulkSheet(null);
  }, []);
  const allVisibleSelected = count > 0 && visible.every((p) => selected?.includes(p.id));

  // Android back button leaves select mode instead of the app.
  useEffect(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitSelect();
      return true;
    });
    return () => sub.remove();
  }, [selecting, exitSelect]);

  const plural = (n: number) => `${n} prompt${n === 1 ? '' : 's'}`;
  const bulkDelete = () => {
    const ids = selected ?? [];
    deletePrompts(ids);
    exitSelect();
    toast(`Moved ${plural(ids.length)} to Trash`, { label: 'Undo', onPress: () => restorePrompts(ids) });
  };
  const selectedPrompts = prompts.filter((p) => selected?.includes(p.id));
  const allPinned = selectedPrompts.length > 0 && selectedPrompts.every((p) => p.pinned);
  const moveTo = (folderId: string | null, name: string) => {
    movePrompts(selected ?? [], folderId);
    toast(`Moved ${plural(count)} to ${name}`);
    exitSelect();
  };

  const remove = (p: Prompt) => {
    deletePrompt(p.id);
    toast('Moved to Trash', { label: 'Undo', onPress: () => restorePrompt(p.id) });
  };

  const chip = (label: string, f: Filter, color?: string, leading?: ReactNode) => (
    <Chip
      key={label}
      label={label}
      color={color}
      leading={leading}
      theme={theme}
      active={sameFilter(filter, f)}
      onPress={() => setFilter(f)}
      // Long-press a category to manage categories.
      onLongPress={f.kind === 'folder' ? () => router.push('/categories') : undefined}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        {selecting && (
          <View style={styles.selectHeader}>
            <Pressable onPress={exitSelect} hitSlop={8} accessibilityLabel="Done selecting" style={styles.selectClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
            <Text style={[styles.selectCount, { color: theme.text }]}>{count === 0 ? 'Select prompts' : `${count} selected`}</Text>
            <Pressable
              onPress={() => setSelected(allVisibleSelected ? [] : visible.map((p) => p.id))}
              hitSlop={8}
              accessibilityLabel={allVisibleSelected ? 'Select none' : 'Select all'}
            >
              <Text style={[styles.selectAll, { color: theme.accent }]}>{allVisibleSelected ? 'None' : 'Select all'}</Text>
            </Pressable>
          </View>
        )}
        <View style={[styles.titleRow, selecting && styles.hidden]}>
          <View style={styles.titleBlock}>
            <BrandTitle theme={theme} />
            <Text style={[styles.hello, { color: theme.text }]} numberOfLines={1}>
              {greeting(hour, profile.displayName)}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              {prompts.length} prompt{prompts.length === 1 ? '' : 's'}
              {folders.length ? ` · ${folders.length} categor${folders.length === 1 ? 'y' : 'ies'}` : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => sync(false)}
              hitSlop={6}
              accessibilityLabel={syncStatus === 'syncing' ? 'Syncing' : syncStatus === 'waiting' ? 'Sync now (changes waiting)' : 'Sync now'}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: pressed ? theme.chip : 'transparent' }]}
            >
              {syncStatus === 'syncing' ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Ionicons name="sync" size={22} color={syncStatus === 'error' ? theme.danger : theme.text} />
              )}
              {syncStatus === 'waiting' && <View style={[styles.waitingDot, { backgroundColor: theme.accent, borderColor: theme.bg }]} />}
            </Pressable>
            <Pressable
              onPress={() => router.push('/profile')}
              hitSlop={6}
              accessibilityLabel={`Profile and sync (${SYNC_LABEL[syncStatus]})`}
              style={({ pressed }) => [styles.avatarBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Avatar theme={theme} uri={profile.avatarUri} name={profile.displayName} size={36} dot={syncDot(syncStatus, theme)} dotRing={syncStatus === 'waiting'} />
            </Pressable>
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

      {progress && progress.total > 0 && (
        <View style={[styles.progress, { backgroundColor: theme.card, borderColor: theme.border }]} accessibilityLiveRegion="polite">
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={[styles.progressText, { color: theme.text }]}>
              {progress.label} · {Math.min(progress.done + 1, progress.total)} of {progress.total}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.chip }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${Math.round((progress.done / progress.total) * 100)}%` }]} />
          </View>
        </View>
      )}

      {settings.showAiBar && aiApps.length > 0 && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aiBar}>
          <View style={styles.aiBarLabel}>
            <Ionicons name="open-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.aiBarLabelText, { color: theme.textMuted }]}>Open</Text>
          </View>
          {aiApps.map((app) => (
            <Pressable
              key={app.key}
              onPress={() => openAiApp(app).catch(() => toast(`Couldn't open ${app.label}`))}
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
          <Chip
            label="Library"
            variant="action"
            theme={theme}
            accessibilityLabel="Browse the prompt library"
            onPress={() => router.push('/library')}
          />
          {chip('All', { kind: 'all' })}
          {chip('Pinned', { kind: 'pinned' })}
          {chip('Recently copied', { kind: 'copied' })}
          {folders.map((f) => {
            const app = aiAppForFolder(f.id);
            return chip(f.name, { kind: 'folder', id: f.id }, f.color, app ? <AppBadge app={app} size={24} /> : undefined);
          })}
          {allTags.map((t) => chip(`#${t}`, { kind: 'tag', tag: t }))}
          <Chip
            label="+ New category"
            variant="action"
            theme={theme}
            accessibilityLabel="Create a new category"
            onPress={() => router.push({ pathname: '/categories', params: { new: '1' } })}
          />
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
        <View style={styles.toolbarRight}>
          <Pressable
            onPress={() => (selecting ? exitSelect() : setSelected([]))}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={selecting ? 'Done selecting' : 'Select prompts'}
            style={styles.selectBtn}
          >
            <Ionicons name={selecting ? 'checkmark-done' : 'checkbox-outline'} size={16} color={selecting ? theme.accent : theme.textMuted} />
            <Text style={[styles.toolbarText, { color: selecting ? theme.accent : theme.textMuted }]}>{selecting ? 'Done' : 'Select'}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/categories')}
            accessibilityRole="button"
            accessibilityLabel="Manage categories"
            style={({ pressed }) => [styles.manageBtn, { backgroundColor: theme.accentSoft, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="folder-open-outline" size={15} color={theme.text} />
            <Text style={[styles.manageText, { color: theme.text }]}>Categories</Text>
          </Pressable>
          <Pressable
            onPress={() => update({ layout: grid ? 'list' : 'grid' })}
            hitSlop={8}
            accessibilityLabel={grid ? 'Show as list' : 'Show as grid'}
          >
            <Ionicons name={grid ? 'list-outline' : 'grid-outline'} size={18} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>

      <FlatList
        key={settings.layout}
        data={visible}
        numColumns={grid ? 2 : 1}
        keyExtractor={(p) => p.id}
        columnWrapperStyle={grid ? styles.gridRow : undefined}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => sync(true)}
            tintColor={theme.accent}
            colors={[theme.accent]}
            progressBackgroundColor={theme.card}
          />
        }
        ListHeaderComponent={
          aiApps.length > 0 && !settings.dismissedTips.includes('ai-launch') ? (
            <TipCard
              theme={theme}
              icon={<HeartMark theme={theme} size={22} />}
              title="Launch prompts in your AI apps"
              onDismiss={() => update({ dismissedTips: [...settings.dismissedTips, 'ai-launch'] })}
              action={{ label: 'Choose apps', onPress: () => router.push('/settings') }}
            >
              Each AI app has its own category. Put a prompt in one (for example Claude) and it gets an{' '}
              <Text style={{ fontWeight: '800' }}>Open in Claude</Text> button that copies it and opens the app. Tap an app in the{' '}
              <Text style={{ fontWeight: '800' }}>Open</Text> bar above to jump straight to it.
            </TipCard>
          ) : !settings.dismissedTips.includes('library') ? (
            <TipCard
              theme={theme}
              icon={<Ionicons name="library-outline" size={20} color={theme.text} />}
              title="Need ideas? Try the prompt library"
              onDismiss={() => update({ dismissedTips: [...settings.dismissedTips, 'library'] })}
              action={{ label: 'Browse prompts', onPress: () => router.push('/library') }}
            >
              {LIBRARY_PROMPTS.length} ready-made prompts for image generation, productivity, business, marketing, writing, coding and
              more. Copy one as it is, or save it to make it your own.
            </TipCard>
          ) : undefined
        }
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
            selecting={selecting}
            selected={!!selected?.includes(item.id)}
            onOpen={selecting ? toggleSelected : openPrompt}
            onCopy={copy}
            onLongPress={selecting ? toggleSelected : setMenuFor}
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
              {!query && filter.kind === 'all' && (
                <Pressable
                  onPress={() => router.push('/library')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.emptyBtn, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}
                >
                  <Ionicons name="library-outline" size={16} color={theme.accentText} />
                  <Text style={[styles.emptyBtnText, { color: theme.accentText }]}>Browse the prompt library</Text>
                </Pressable>
              )}
            </View>
          ) : undefined
        }
      />

      {!selecting && (
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
      )}

      {selecting && (
        <View style={[styles.bulkBar, { backgroundColor: theme.elevated, borderColor: theme.border, bottom: insets.bottom + 16 }]}>
          <BulkButton theme={theme} icon="folder-outline" label="Move" disabled={count === 0} onPress={() => setBulkSheet('move')} />
          <BulkButton theme={theme} icon="pricetag-outline" label="Tag" disabled={count === 0} onPress={() => setBulkSheet('tag')} />
          <BulkButton
            theme={theme}
            icon={allPinned ? 'pin' : 'pin-outline'}
            label={allPinned ? 'Unpin' : 'Pin'}
            disabled={count === 0}
            onPress={() => {
              setPinned(selected ?? [], !allPinned);
              toast(`${allPinned ? 'Unpinned' : 'Pinned'} ${plural(count)}`);
            }}
          />
          <BulkButton theme={theme} icon="trash-outline" label="Delete" danger disabled={count === 0} onPress={bulkDelete} />
        </View>
      )}

      <ActionSheet
        visible={bulkSheet === 'move'}
        title={`Move ${plural(count)} to…`}
        onClose={() => setBulkSheet(null)}
        actions={[
          { label: 'No category', onPress: () => moveTo(null, 'No category') },
          ...folders.map((f) => ({ label: f.name, onPress: () => moveTo(f.id, f.name) })),
        ]}
      />

      <TagSheet
        visible={bulkSheet === 'tag'}
        title={`Tag ${plural(count)}`}
        existingTags={allTags}
        onClose={() => setBulkSheet(null)}
        onAdd={(t) => {
          tagPrompts(selected ?? [], t);
          toast(`Tagged ${plural(count)} with #${t}`);
          exitSelect();
        }}
      />

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
                { label: 'Select multiple…', onPress: () => setSelected([menuFor.id]) },
                { label: 'Duplicate', onPress: () => duplicatePrompt(menuFor.id) },
                { label: 'Move to Trash', destructive: true, onPress: () => remove(menuFor) },
              ]
            : []
        }
      />
    </View>
  );
}

function BulkButton({ theme, icon, label, onPress, disabled, danger }: {
  theme: ReturnType<typeof useTheme>;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const color = danger ? theme.danger : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} selected prompts`}
      style={({ pressed }) => [styles.bulkBtn, { opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.bulkText, { color }]}>{label}</Text>
    </Pressable>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  titleBlock: { flex: 1, minWidth: 0 },
  hello: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  avatarBtn: { padding: 2 },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  waitingDot: { position: 'absolute', top: 5, right: 5, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 44, borderRadius: 14 },
  searchInput: { flex: 1, fontSize: 15, height: '100%' },
  aiBar: { gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  aiPill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 5, paddingRight: 12, height: 34, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth },
  aiPillText: { fontSize: 13, fontWeight: '700' },
  chips: { gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 6 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  hidden: { display: 'none' },
  progress: { marginHorizontal: 16, marginTop: 10, padding: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressText: { fontSize: 13, fontWeight: '700' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  selectHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 56 },
  selectClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  selectCount: { flex: 1, fontSize: 20, fontWeight: '800' },
  selectAll: { fontSize: 15, fontWeight: '700' },
  selectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bulkBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  bulkBtn: { alignItems: 'center', gap: 2, paddingHorizontal: 12, paddingVertical: 4 },
  bulkText: { fontSize: 12, fontWeight: '700' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 30, borderRadius: 10 },
  manageText: { fontSize: 13, fontWeight: '700' },
  aiBarLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 2 },
  aiBarLabelText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  toolbarText: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  gridRow: { gap: 12 },
  empty: { alignItems: 'center', gap: 8, paddingTop: 70, paddingHorizontal: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 18, borderRadius: 21, marginTop: 10 },
  emptyBtnText: { fontSize: 14, fontWeight: '700' },
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
