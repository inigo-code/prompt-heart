import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBadge } from '@/components/AppBadge';
import { Avatar } from '@/components/Avatar';
import { ControlRow, Row, Section, Segmented, ToggleRow } from '@/components/SettingsUI';
import { useToast } from '@/components/Toast';
import { AI_APPS } from '@/lib/ai';
import { APP_NAME } from '@/lib/app';
import { exportBackup, exportMarkdown, pickBackup, restoreBackupImages } from '@/lib/backup';
import { ACCENTS, useTheme } from '@/lib/theme';
import { LIBRARY_PROMPTS } from '@/library/prompts';
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
  const store = usePromptStore();
  const sync = useSync();
  const profile = useProfile();
  const [busy, setBusy] = useState<'backup' | 'markdown' | 'import' | null>(null);

  const run = async (kind: 'backup' | 'markdown' | 'import', fn: () => Promise<string | null>) => {
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
      <Section theme={theme} title="Profile">
        <Row
          theme={theme}
          leading={<Avatar theme={theme} uri={profile.avatarUri} name={profile.displayName} size={40} />}
          label={profile.displayName || 'Set up your profile'}
          value={sync.user?.email ?? (sync.status === 'unconfigured' ? undefined : 'Not signed in')}
          onPress={() => router.push('/profile')}
          last
        />
      </Section>

      <Section theme={theme} title="Appearance">
        <ControlRow theme={theme} label="Theme">
          <Segmented
            theme={theme}
            value={settings.themeMode}
            onChange={(themeMode) => update({ themeMode })}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </ControlRow>
        <ControlRow theme={theme} label="Accent colour">
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
                  style={[styles.swatchRing, { borderColor: active ? theme.text : 'transparent' }]}
                >
                  <View style={[styles.swatch, { backgroundColor: color }]} />
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
              { value: 'list', label: 'List' },
              { value: 'grid', label: 'Grid' },
            ]}
          />
        </ControlRow>
        <ControlRow theme={theme} label="Card preview" last>
          <Segmented
            theme={theme}
            value={settings.previewLines}
            onChange={(previewLines) => update({ previewLines })}
            options={[
              { value: 2, label: 'Short' },
              { value: 4, label: 'Medium' },
              { value: 6, label: 'Long' },
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
        title="AI apps"
        footer={`Each app you turn on gets its own category. Prompts saved there get a button that copies the prompt and opens the app (ChatGPT, Claude, Grok and Perplexity open with it pre-typed; for the others, just paste). Turning an app off hides it everywhere, including its category; its prompts stay under All.`}
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
        <Row theme={theme} icon="cloud-outline" label="Cloud sync" value={SYNC_LABEL[sync.status]} onPress={() => router.push('/account')} />
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
        <Row theme={theme} icon="push-outline" label="Import backup" busy={busy === 'import'} onPress={doImport} />
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
        <Row theme={theme} icon="information-circle-outline" label={`About ${APP_NAME}`} onPress={() => router.push('/about')} />
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

const styles = StyleSheet.create({
  content: { padding: 16, gap: 24 },
  swatches: { flexDirection: 'row', gap: 12 },
  swatchRing: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 28, height: 28, borderRadius: 14 },
});
