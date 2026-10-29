import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBadge } from '@/components/AppBadge';
import { Avatar } from '@/components/Avatar';
import { ControlRow, Row, Section, Segmented, ToggleRow } from '@/components/SettingsUI';
import { useToast } from '@/components/Toast';
import { AI_APPS } from '@/lib/ai';
import { APP_NAME, HEART_APPS } from '@/lib/app';
import { exportBackup, exportCsv, exportMarkdown, pickBackup, restoreBackupImages } from '@/lib/backup';
import { ACCENTS, useTheme } from '@/lib/theme';
import { LIBRARY_PROMPTS } from '@/library/prompts';
import { useAppLock } from '@/lock/AppLockProvider';
import { lockSupport } from '@/lock/authenticate';
import { LOCK_AFTER_OPTIONS } from '@/lock/lockTiming';
import { useProfile } from '@/profile/ProfileProvider';
import { useSettings } from '@/settings/SettingsProvider';
import type { AccentKey } from '@/settings/SettingsProvider';
import { usePromptStore } from '@/store/PromptStore';
import { useSync } from '@/sync/SyncProvider';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const SYNC_LABEL = {
  unconfigured: 'Not set up',
  'signed-out': 'Signed out',
  idle: 'On',
  syncing: 'Syncing…',
  waiting: 'Changes waiting',
  synced: 'Up to date',
  error: 'Needs attention',
} as const;

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { settings, update, reset } = useSettings();
  const lock = useAppLock();
  const store = usePromptStore();
  const sync = useSync();
  const profile = useProfile();
  const [busy, setBusy] = useState<'backup' | 'markdown' | 'csv' | 'import' | null>(null);

  const run = async (kind: 'backup' | 'markdown' | 'csv' | 'import', fn: () => Promise<string | null>) => {
    setBusy(kind);
    try {
      const msg = await fn();
      if (msg) toast(msg);
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  // Turning App lock on or off always asks for the phone's lock first, so someone holding an
  // unlocked phone can't quietly switch it off (or lock you out by switching it on).
  const toggleLock = async (on: boolean) => {
    if (on) {
      const support = await lockSupport();
      if (support === 'no-screen-lock') {
        toast('Set up a screen lock (PIN, pattern, password or fingerprint) in Android settings first.');
        return;
      }
      if (support === 'unsupported') {
        toast("App lock isn't available on this device.");
        return;
      }
    }
    const result = await lock.confirm(on ? 'Turn on App lock' : 'Turn off App lock');
    if (result === 'locked-out') toast('Too many tries. Wait a moment, then try again.');
    if (result !== 'ok') return;
    update({ appLock: on });
    if (on) lock.markUnlocked();
    toast(on ? 'App lock is on' : 'App lock is off');
  };

  const doImport = () =>
    run('import', async () => {
      const backup = await pickBackup();
      if (!backup) return null;
      await restoreBackupImages(backup);
      const r = store.importBackup(backup);
      const parts = [`${r.added} added`, r.updated ? `${r.updated} updated` : '', r.skipped ? `${r.skipped} already up to date` : ''];
      return `Imported: ${parts.filter(Boolean).join(', ')}`;
    });

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      {/* The account comes first, so signing in to sync is easy to find. */}
      <Section theme={theme} title="Account">
        <Row
          theme={theme}
          leading={<Avatar theme={theme} uri={profile.avatarUri} name={profile.displayName} size={40} />}
          label={profile.displayName || 'Set up your profile'}
          value={sync.user?.email ?? undefined}
          onPress={() => router.push('/profile')}
          last={sync.status === 'unconfigured'}
        />
        {sync.status !== 'unconfigured' && (
          <Row
            theme={theme}
            icon={sync.user ? 'cloud-done-outline' : 'log-in-outline'}
            label={sync.user ? 'Cloud sync' : 'Sign in or create account'}
            value={sync.user ? SYNC_LABEL[sync.status] : undefined}
            onPress={() => router.push('/account')}
            last
          />
        )}
      </Section>

      <Section theme={theme} title="Appearance">
        <ControlRow theme={theme} label="Theme">
          <Segmented
            theme={theme}
            value={settings.themeMode}
            onChange={(themeMode) => update({ themeMode })}
            options={[
              { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
              { value: 'light', label: 'Light', icon: 'sunny-outline' },
              { value: 'dark', label: 'Dark', icon: 'moon-outline' },
            ]}
          />
        </ControlRow>
        <ControlRow theme={theme} label="Accent colour" value={ACCENTS[settings.accent].label}>
          <View style={styles.swatches}>
            {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
              const color = ACCENTS[key][theme.dark ? 'dark' : 'light'][0];
              const active = settings.accent === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => update({ accent: key })}
                  accessibilityLabel={`${ACCENTS[key].label} accent`}
                  accessibilityState={{ selected: active }}
                  style={[styles.swatchRing, { borderColor: active ? color : 'transparent' }]}
                >
                  <View style={[styles.swatch, { backgroundColor: color }]}>
                    {active && <Ionicons name="checkmark" size={20} color={ACCENTS[key][theme.dark ? 'dark' : 'light'][1]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ControlRow>
        <ControlRow theme={theme} label="Home layout">
          <Segmented
            theme={theme}
            value={settings.layout}
            onChange={(layout) => update({ layout })}
            options={[
              { value: 'list', label: 'List', icon: 'list-outline' },
              { value: 'grid', label: 'Grid', icon: 'grid-outline' },
            ]}
          />
        </ControlRow>
        <ControlRow theme={theme} label="Card preview" last>
          <Segmented
            theme={theme}
            value={settings.previewLines}
            onChange={(previewLines) => update({ previewLines })}
            options={[
              { value: 2, label: 'Short', icon: 'reorder-two-outline' },
              { value: 4, label: 'Medium', icon: 'reorder-three-outline' },
              { value: 6, label: 'Long', icon: 'reorder-four-outline' },
            ]}
          />
        </ControlRow>
      </Section>

      <Section theme={theme} title="Behaviour">
        <ToggleRow theme={theme} icon="pulse-outline" label="Vibrate on copy" value={settings.haptics} onChange={(haptics) => update({ haptics })} />
        <ToggleRow
          theme={theme}
          icon="stats-chart-outline"
          label="Show token estimates"
          value={settings.showTokens}
          onChange={(showTokens) => update({ showTokens })}
          last
        />
      </Section>

      <Section
        theme={theme}
        title="Security"
        footer="App lock uses your fingerprint, face or phone screen lock, and hides your prompts in the recent-apps screen. Prompt Heart never sees your fingerprint or PIN."
      >
        <ToggleRow
          theme={theme}
          icon="lock-closed-outline"
          label="App lock"
          value={settings.appLock}
          onChange={(on) => void toggleLock(on)}
          last={!settings.appLock}
        />
        {settings.appLock && (
          <ControlRow theme={theme} label="Lock after leaving the app" last>
            <Segmented
              theme={theme}
              value={settings.lockAfter}
              onChange={(lockAfter) => update({ lockAfter })}
              options={LOCK_AFTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </ControlRow>
        )}
      </Section>

      <Section
        theme={theme}
        title="AI apps"
        footer={`Each app you turn on gets its own category. Prompts saved there get a button that copies the prompt and opens the app, ready to paste. Turning an app off hides it everywhere, including its category; its prompts stay under All.`}
      >
        <ToggleRow
          theme={theme}
          icon="apps-outline"
          label="Show AI app bar on home"
          value={settings.showAiBar}
          onChange={(showAiBar) => update({ showAiBar })}
        />
        {AI_APPS.map((app, i) => (
          <ToggleRow
            key={app.key}
            theme={theme}
            leading={<AppBadge app={app} size={30} />}
            label={app.label}
            value={!!settings.aiApps[app.key]}
            onChange={(on) => update({ aiApps: { ...settings.aiApps, [app.key]: on } })}
            last={i === AI_APPS.length - 1}
          />
        ))}
      </Section>

      <Section
        theme={theme}
        title="Your data"
        footer="Backups include categories, tags and attached images. Importing merges into what you have; nothing is deleted."
      >
        <Row
          theme={theme}
          icon="download-outline"
          label="Export backup"
          busy={busy === 'backup'}
          onPress={() =>
            run('backup', async () => {
              const r = await exportBackup(store.prompts, store.folders);
              return `Exported ${r.prompts} prompts${r.images ? ` and ${r.images} images` : ''}`;
            })
          }
        />
        <Row
          theme={theme}
          icon="document-text-outline"
          label="Export as Markdown"
          busy={busy === 'markdown'}
          onPress={() => run('markdown', async () => (await exportMarkdown(store.prompts, store.folders), null))}
        />
        <Row
          theme={theme}
          icon="grid-outline"
          label="Export as spreadsheet (CSV)"
          busy={busy === 'csv'}
          onPress={() => run('csv', async () => (await exportCsv(store.prompts, store.folders), null))}
        />
        <Row theme={theme} icon="push-outline" label="Import backup" busy={busy === 'import'} onPress={doImport} />
        <Row theme={theme} icon="enter-outline" label="Import from other apps" onPress={() => router.push('/import')} />
        <Row
          theme={theme}
          icon="library-outline"
          label="Prompt library"
          value={String(LIBRARY_PROMPTS.length)}
          onPress={() => router.push('/library')}
        />
        <Row theme={theme} icon="trash-outline" label="Trash" value={String(store.trash.length)} onPress={() => router.push('/trash')} last />
      </Section>

      <Section theme={theme} title="About">
        <Row
          theme={theme}
          leading={<Image source={HEART_APPS_TILE} style={styles.heartApps} />}
          label={`About ${APP_NAME}`}
          value={HEART_APPS.name}
          onPress={() => router.push('/about')}
        />
        <Row
          theme={theme}
          icon="refresh-outline"
          label="Reset settings"
          destructive
          last
          onPress={() => {
            reset();
            toast('Settings reset to defaults');
          }}
        />
      </Section>
    </ScrollView>
  );
}

const HEART_APPS_TILE = require('../../assets/brand/heart-apps-tile.png');

const styles = StyleSheet.create({
  heartApps: { width: 30, height: 30, borderRadius: 8 },
  content: { padding: 16, gap: 24 },
  swatches: { flexDirection: 'row', gap: 10 },
  swatchRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
