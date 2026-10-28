import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/Toast';
import { pickImportFiles } from '@/lib/backup';
import { newId } from '@/lib/id';
import { planImport } from '@/lib/importFiles';
import type { ParsedFile } from '@/lib/importFiles';
import { font, useTheme } from '@/lib/theme';
import { FOLDER_COLORS, usePromptStore } from '@/store/PromptStore';
import type { Folder, Prompt } from '@/store/types';

const SOURCES: { name: string; how: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'Spreadsheets', how: 'A CSV from Google Sheets, Excel or Numbers, with a column for the prompt and, if you like, title, category and tags.', icon: 'grid-outline' },
  { name: 'Notion', how: 'Export a database as Markdown & CSV, then pick the .csv file.', icon: 'document-outline' },
  { name: 'awesome-chatgpt-prompts', how: 'The prompts.csv file from the popular list on GitHub: every “act” becomes a prompt.', icon: 'logo-github' },
  { name: 'JSON', how: 'A list of prompts from another prompt manager, with fields like name or title and prompt or content.', icon: 'code-slash-outline' },
  { name: 'Markdown and text', how: 'One prompt per heading, or one per file. Prompt Heart’s own Markdown export reads back in with its categories.', icon: 'reader-outline' },
];

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function ImportScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const store = usePromptStore();
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const plan = planImport(files, store.prompts, store.folders);

  const choose = async () => {
    setBusy(true);
    try {
      const picked = await pickImportFiles();
      if (!picked) return;
      setFiles(picked.files);
      setErrors(picked.errors);
    } catch (e) {
      toast(`Couldn’t read the files: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    const { prompts, folders } = buildRecords(plan, store.folders.length);
    const result = store.importBackup({ prompts, folders });
    toast(`Added ${plural(result.added, 'prompt')}${folders.length ? ` and ${plural(folders.length, 'category', 'categories')}` : ''}`);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <Text style={[styles.lede, { color: theme.text }]}>
        Bring prompts from another app or a file you keep. Pick one or more files as they are; nothing is added until you say so, and prompts you already have are skipped.
      </Text>

      <Pressable
        onPress={choose}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => [styles.choose, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
      >
        {busy ? <ActivityIndicator color={theme.accentText} /> : <Ionicons name="folder-open-outline" size={20} color={theme.accentText} />}
        <Text style={[styles.chooseText, { color: theme.accentText }]}>{files.length ? 'Choose other files' : 'Choose files'}</Text>
      </Pressable>

      {(files.length > 0 || errors.length > 0) && (
        <View style={[styles.plan, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {files.map((f) => (
            <View key={f.name} style={styles.fileRow}>
              <Ionicons name="document-text-outline" size={18} color={theme.textMuted} />
              <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={[styles.fileCount, { color: theme.textMuted }]}>{plural(f.prompts.length, 'prompt')}</Text>
            </View>
          ))}
          {errors.map((e) => (
            <View key={e} style={styles.fileRow}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
              <Text style={[styles.fileName, { color: theme.danger }]}>{e}</Text>
            </View>
          ))}
          {files.length > 0 && (
            <>
              <Text style={[styles.summary, { color: theme.text }]}>
                {plan.prompts.length ? `${plural(plan.prompts.length, 'new prompt')} to add` : 'Nothing new to add'}
                {plan.duplicates ? `. ${plural(plan.duplicates, 'prompt')} you already have will be skipped` : ''}
                {plan.newCategories.length ? `. New ${plan.newCategories.length === 1 ? 'category' : 'categories'}: ${plan.newCategories.join(', ')}` : ''}.
              </Text>
              {plan.prompts.length > 0 && (
                <View style={styles.preview}>
                  {plan.prompts.slice(0, 5).map((p, i) => (
                    <Text key={`${p.title}-${i}`} style={[styles.previewItem, { color: theme.textMuted }]} numberOfLines={1}>
                      • {p.title}
                    </Text>
                  ))}
                  {plan.prompts.length > 5 && <Text style={[styles.previewItem, { color: theme.textMuted }]}>and {plan.prompts.length - 5} more</Text>}
                </View>
              )}
              <Pressable
                onPress={add}
                disabled={!plan.prompts.length}
                accessibilityRole="button"
                accessibilityState={{ disabled: !plan.prompts.length }}
                style={({ pressed }) => [styles.add, { backgroundColor: theme.text, opacity: !plan.prompts.length ? 0.4 : pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.addText, { color: theme.bg }]}>{plan.prompts.length ? `Add ${plural(plan.prompts.length, 'prompt')}` : 'Nothing to add'}</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      <Text style={[styles.heading, { color: theme.textMuted }]}>What you can import</Text>
      <View style={[styles.sources, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {SOURCES.map((s, i) => (
          <View key={s.name} style={[styles.source, i < SOURCES.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View style={[styles.sourceIcon, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name={s.icon} size={18} color={theme.text} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.sourceName, { color: theme.text }]}>{s.name}</Text>
              <Text style={[styles.sourceHow, { color: theme.textMuted }]}>{s.how}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={[styles.note, { color: theme.textMuted }]}>
        Placeholders written as {'{{name}}'} or {'{{tone|friendly}}'} come across as blanks you fill in when you copy. Prompt Heart backups go through Settings → Import backup instead.
      </Text>
    </ScrollView>
  );
}

/** The new prompts and categories for an import plan, as store records. */
function buildRecords(plan: ReturnType<typeof planImport>, folderCount: number): { prompts: Prompt[]; folders: Folder[] } {
  const now = Date.now();
  const folders: Folder[] = plan.newCategories.map((name, i) => ({
    id: newId(),
    name,
    color: FOLDER_COLORS[(folderCount + i) % FOLDER_COLORS.length],
    createdAt: now,
    modifiedAt: now,
    deletedAt: null,
  }));
  const folderFor = (name: string | null) => plan.folderIdFor(name) ?? folders.find((f) => f.name === name)?.id ?? null;
  const prompts: Prompt[] = plan.prompts.map((p, i) => ({
    id: newId(),
    title: p.title,
    body: p.body,
    folderId: folderFor(p.category),
    tags: p.tags,
    pinned: false,
    images: [],
    copyCount: 0,
    // A millisecond apart keeps the file's order in "Recently edited".
    createdAt: now - i,
    updatedAt: now - i,
    lastCopiedAt: null,
    modifiedAt: now,
    deletedAt: null,
  }));
  return { prompts, folders };
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  lede: { fontSize: font.body, lineHeight: 22 },
  choose: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26 },
  chooseText: { fontSize: font.headline, fontWeight: '800' },
  plan: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileName: { flex: 1, fontSize: font.body, fontWeight: '600' },
  fileCount: { fontSize: font.footnote },
  summary: { fontSize: font.body, lineHeight: 21, marginTop: 4 },
  preview: { gap: 2 },
  previewItem: { fontSize: font.footnote },
  add: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  addText: { fontSize: font.body, fontWeight: '800' },
  heading: { fontSize: font.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 6, marginTop: 8 },
  sources: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  source: { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' },
  sourceIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sourceName: { fontSize: font.body, fontWeight: '700' },
  sourceHow: { fontSize: font.footnote, lineHeight: 18 },
  note: { fontSize: font.footnote, lineHeight: 18, paddingHorizontal: 6 },
});
