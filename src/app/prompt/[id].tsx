import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardSafe } from '@/components/KeyboardSafe';
import { ActionSheet } from '@/components/ActionSheet';
import { AppBadge } from '@/components/AppBadge';
import { Chip } from '@/components/Chip';
import { FormatBar } from '@/components/FormatBar';
import { ImageThumb } from '@/components/ImageThumb';
import { ImageViewer } from '@/components/ImageViewer';
import { PromptText } from '@/components/PromptText';
import { useToast } from '@/components/Toast';
import { applyFormat } from '@/lib/format';
import type { FormatKind, Selection } from '@/lib/format';
import { deleteLocalImage, imagesSupported, pickImages } from '@/lib/images';
import { estimateTokens, extractVariables } from '@/lib/templates';
import { font, useTheme } from '@/lib/theme';
import { createUndo, textChange } from '@/lib/undo';
import type { UndoKind } from '@/lib/undo';
import { useEnabledAiApps, useLaunchApp, useVisibleFolders } from '@/lib/useAiApps';
import { useCopyPrompt } from '@/lib/useCopyPrompt';
import { useSettings } from '@/settings/SettingsProvider';
import { useSync } from '@/sync/SyncProvider';
import { useHistory } from '@/store/HistoryProvider';
import { normalizeTag, usePromptStore } from '@/store/PromptStore';
import type { PromptDraft } from '@/store/types';

type TextDraft = Omit<PromptDraft, 'images'>;
type Typed = Pick<TextDraft, 'title' | 'body'>;

// Wait for saved data before setting up the editor, so a cold start straight into a prompt
// (deep link or restored route) doesn't begin from an empty draft and overwrite the text.
export default function PromptEditorScreen() {
  const { ready } = usePromptStore();
  const theme = useTheme();
  if (!ready) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.textMuted} />
      </View>
    );
  }
  return <PromptEditor />;
}

function PromptEditor() {
  const params = useLocalSearchParams<{ id: string; folderId?: string; copy?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { settings } = useSettings();
  const store = usePromptStore();
  const copy = useCopyPrompt();
  const history = useHistory();
  const { imageUsage } = useSync();
  const cloudFull = !!imageUsage && imageUsage.used >= imageUsage.limit;
  // One version is saved per editing session, right before the first change to the text.
  const snapped = useRef(false);
  const aiApps = useEnabledAiApps();
  const folders = useVisibleFolders();

  // A new prompt only gets an id once there's content, so backing out leaves nothing behind.
  const [id, setId] = useState<string | null>(params.id === 'new' ? null : params.id);
  const existing = id ? store.getPrompt(id) : undefined;

  const [draft, setDraft] = useState<TextDraft>(() => ({
    title: existing?.title ?? '',
    body: existing?.body ?? '',
    folderId: existing?.folderId ?? params.folderId ?? null,
    tags: existing?.tags ?? [],
    pinned: existing?.pinned ?? false,
  }));
  const [tagInput, setTagInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  // Saved prompts open read-only so a stray tap can't change them; Edit switches to the editor.
  const [editing, setEditing] = useState(params.id === 'new');
  const [undo] = useState(() =>
    createUndo<Typed>({ title: draft.title, body: draft.body }, { same: (a, b) => a.title === b.title && a.body === b.body }),
  );
  const [undoable, setUndoable] = useState({ canUndo: false, canRedo: false });
  // The field typed in last, and whether the current undo step already has a word in it.
  const burst = useRef<{ field: keyof Typed | null; word: boolean }>({ field: null, word: false });
  const syncUndo = () => setUndoable({ canUndo: undo.canUndo(), canRedo: undo.canRedo() });
  const bodyRef = useRef<ComponentRef<typeof TextInput>>(null);
  // Where formatting applies: the body's last selection (the end of the text until it's focused).
  const selectionRef = useRef<Selection>({ start: draft.body.length, end: draft.body.length });
  const [selection, setSelection] = useState<Selection | undefined>();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  // While typing at the end of a long prompt, keep the last line in view above the keyboard.
  const followCaret = () => {
    if (editing && bodyRef.current?.isFocused() && selectionRef.current.end >= draft.body.length) scrollRef.current?.scrollToEnd({ animated: false });
  };

  // Images are edited straight in the store (they aren't typed), so read them from there.
  const prompt = id ? store.getPrompt(id) : undefined;
  const images = prompt?.images ?? [];
  const launchApp = useLaunchApp(draft.folderId);
  const folder = folders.find((f) => f.id === draft.folderId);

  // Opened from the home-screen widget to fill in a prompt's blanks: start the copy straight away, once.
  const copyOnOpen = useRef(params.copy === '1');
  useEffect(() => {
    if (!copyOnOpen.current || !prompt) return;
    copyOnOpen.current = false;
    copy(prompt);
  }, [prompt, copy]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const change = (patch: Partial<TextDraft>) => {
    if (id && !snapped.current && (patch.title !== undefined || patch.body !== undefined)) {
      history.snapshot(id);
      snapped.current = true;
    }
    const next = { ...draft, ...patch };
    setDraft(next);
    if (id) store.updatePrompt(id, patch);
    else if (next.title.trim() || next.body.trim()) setId(store.createPrompt(next).id);
  };

  // Undo steps: a word of typing (with the spaces after it), a paste, or one format button press.
  // Moving to the other field always starts a new step.
  const type = (patch: Partial<Typed>, kind: UndoKind = 'typing') => {
    const field: keyof Typed = patch.body !== undefined ? 'body' : 'title';
    const before = draft[field];
    const { start, inserted, removed } = textChange(before, patch[field] ?? before);
    // Pastes and typing over a selection are a step of their own.
    const step: UndoKind = kind === 'typing' && (inserted.length > 1 || (inserted && removed)) ? 'action' : kind;
    const letter = inserted.length === 1 && /\S/.test(inserted);
    const newWord = letter && burst.current.word && /\s/.test(before[start - 1] ?? '');
    if (field !== burst.current.field || (step === 'typing' && newWord)) undo.breakBurst();
    change(patch);
    const fresh = undo.record({ title: patch.title ?? draft.title, body: patch.body ?? draft.body }, Date.now(), step);
    burst.current = { field, word: (fresh ? false : burst.current.word) || letter };
    syncUndo();
  };

  const stepBack = (to: Typed | null) => {
    if (!to) return;
    const patch: Partial<Typed> = {};
    if (to.title !== draft.title) patch.title = to.title;
    if (to.body !== draft.body) patch.body = to.body;
    change(patch);
    burst.current = { field: null, word: false };
    syncUndo();
    // Put the caret where the text changed rather than at the end.
    if (patch.body !== undefined) {
      const { start, inserted } = textChange(draft.body, patch.body);
      const at = { start: start + inserted.length, end: start + inserted.length };
      selectionRef.current = at;
      setSelection(at);
    }
  };

  const format = (kind: FormatKind) => {
    const next = applyFormat(draft.body, selectionRef.current, kind);
    type({ body: next.text }, 'action');
    selectionRef.current = next.selection;
    setSelection(next.selection);
    bodyRef.current?.focus();
  };

  const finishEditing = () => {
    Keyboard.dismiss();
    if (!id) leave();
    else setEditing(false);
  };

  // A prompt cleared out completely is removed for good rather than sent to Trash.
  const latest = useRef({ id, draft, images });
  useEffect(() => {
    latest.current = { id, draft, images };
  });
  useEffect(
    () => () => {
      const { id: lastId, draft: d, images: imgs } = latest.current;
      if (lastId && !d.title.trim() && !d.body.trim() && imgs.length === 0) store.purgePrompt(lastId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const getSnapshot = store.sync.getSnapshot;
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const p = getSnapshot().prompts.find((x) => x.id === id);
      // Only when the saved text differs (a version was restored): this also runs when a new
      // prompt gets its id on the first letter, and resetting then would lose that undo step.
      const d = latest.current.draft;
      if (p && (d.title !== p.title || d.body !== p.body)) {
        setDraft({ ...d, title: p.title, body: p.body });
        undo.reset({ title: p.title, body: p.body });
        setUndoable({ canUndo: false, canRedo: false });
      }
      snapped.current = false;
    }, [id, getSnapshot, undo]),
  );

  const addTags = (raw: string[]) => {
    const fresh = raw.map(normalizeTag).filter((t, i, all) => t && !draft.tags.includes(t) && all.indexOf(t) === i);
    if (fresh.length) change({ tags: [...draft.tags, ...fresh] });
  };

  // Commas and spaces finish a tag; this also handles pasting "a, b c" in one go.
  const onTagText = (v: string) => {
    const parts = v.split(/[,\s]+/);
    const rest = parts.pop() ?? '';
    addTags(parts);
    setTagInput(rest);
  };

  const addTag = () => {
    addTags([tagInput]);
    setTagInput('');
  };

  const attach = async () => {
    setAttaching(true);
    try {
      const ids = await pickImages();
      if (ids.length === 0) return;
      if (id) store.attachImages(id, ids);
      else setId(store.createPrompt({ ...draft, images: ids }).id);
    } catch (e) {
      toast(`Couldn't add image: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAttaching(false);
    }
  };

  const removeImage = (imageId: string) => {
    if (id && store.removeImage(id, imageId)) deleteLocalImage(imageId);
  };

  const words = draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0;
  const variables = extractVariables(draft.body);

  if (params.id !== 'new' && !existing && !id) {
    return (
      <View style={[styles.missing, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.textMuted }}>This prompt no longer exists.</Text>
      </View>
    );
  }

  return (
    <KeyboardSafe style={{ backgroundColor: theme.bg }} onKeyboardShown={followCaret}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable hitSlop={8} accessibilityLabel="Copy prompt" disabled={!prompt} onPress={() => prompt && copy(prompt)}>
                <Ionicons name="copy-outline" size={22} color={prompt ? theme.text : theme.textMuted} />
              </Pressable>
              <Pressable hitSlop={8} accessibilityLabel={draft.pinned ? 'Unpin' : 'Pin'} onPress={() => change({ pinned: !draft.pinned })}>
                <Ionicons name={draft.pinned ? 'pin' : 'pin-outline'} size={22} color={draft.pinned ? theme.accent : theme.text} />
              </Pressable>
              <Pressable hitSlop={8} accessibilityLabel="More" disabled={!id} onPress={() => setMenuOpen(true)}>
                <Ionicons name="ellipsis-horizontal" size={22} color={id ? theme.text : theme.textMuted} />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={editing ? finishEditing : () => setEditing(true)}
                accessibilityRole="button"
                accessibilityLabel={editing ? 'Done editing' : 'Edit prompt'}
                style={({ pressed }) => [styles.editBtn, { backgroundColor: editing ? theme.accent : theme.chip, opacity: pressed ? 0.75 : 1 }]}
              >
                {!editing && <Ionicons name="create-outline" size={16} color={theme.text} />}
                <Text style={[styles.editText, { color: editing ? theme.accentText : theme.text }]}>{editing ? 'Done' : 'Edit'}</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      {editing && (
        <FormatBar
          theme={theme}
          canUndo={undoable.canUndo}
          canRedo={undoable.canRedo}
          onUndo={() => stepBack(undo.undo())}
          onRedo={() => stepBack(undo.redo())}
          onFormat={format}
        />
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={followCaret}
      >
        {editing ? (
          <TextInput
            value={draft.title}
            onChangeText={(title) => type({ title })}
            placeholder="Title"
            placeholderTextColor={theme.textMuted}
            style={[styles.title, { color: theme.text }]}
            autoFocus={params.id === 'new'}
          />
        ) : (
          <Text selectable accessibilityRole="header" style={[styles.title, { color: draft.title ? theme.text : theme.textMuted }]}>
            {draft.title || 'Untitled'}
          </Text>
        )}

        {!editing && folder && (
          <View style={styles.row}>
            <View style={[styles.tag, { backgroundColor: theme.chip }]}>
              <View style={[styles.folderDot, { backgroundColor: folder.color }]} />
              <Text style={{ color: theme.text, fontSize: font.footnote, fontWeight: '600' }}>{folder.name}</Text>
            </View>
          </View>
        )}
        {editing && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            <Chip label="No category" theme={theme} active={draft.folderId === null} onPress={() => change({ folderId: null })} />
            {folders.map((f) => (
              <Chip
                key={f.id}
                label={f.name}
                color={f.color}
                theme={theme}
                active={draft.folderId === f.id}
                onPress={() => change({ folderId: f.id })}
              />
            ))}
            <Chip label="+ New category" variant="action" theme={theme} onPress={() => router.push({ pathname: '/categories', params: { new: '1' } })} />
          </ScrollView>
        )}

        {launchApp && (
          <Pressable
            onPress={() => prompt && copy(prompt, { openIn: launchApp })}
            disabled={!prompt}
            accessibilityRole="button"
            accessibilityLabel={`Copy and open in ${launchApp.label}`}
            style={({ pressed }) => [
              styles.launch,
              { backgroundColor: launchApp.color + (theme.dark ? '33' : '1F'), borderColor: launchApp.color + '66', opacity: !prompt ? 0.5 : pressed ? 0.75 : 1 },
            ]}
          >
            <AppBadge app={launchApp} size={28} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.launchTitle, { color: theme.text }]}>Copy & open in {launchApp.label}</Text>
              <Text style={[styles.launchSub, { color: theme.textMuted }]}>
                {launchApp.prefills ? 'Opens with this prompt already typed in.' : 'Opens the app; just paste.'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={theme.text} />
          </Pressable>
        )}

        {(editing || draft.tags.length > 0) && (
          <View style={[styles.row, styles.wrap]}>
            {draft.tags.map((t) => (
              <Pressable
                key={t}
                disabled={!editing}
                onPress={() => change({ tags: draft.tags.filter((x) => x !== t) })}
                accessibilityLabel={editing ? `Remove tag ${t}` : `Tag ${t}`}
                style={[styles.tag, { backgroundColor: theme.chip }]}
              >
                <Text style={{ color: theme.text, fontSize: font.footnote }}>#{t}</Text>
                {editing && <Ionicons name="close" size={13} color={theme.textMuted} />}
              </Pressable>
            ))}
            {editing && (
              <TextInput
                value={tagInput}
                onChangeText={onTagText}
                onSubmitEditing={addTag}
                onBlur={addTag}
                placeholder="+ tag"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                submitBehavior="submit"
                style={[styles.tagInput, { color: theme.text }]}
              />
            )}
          </View>
        )}

        {(images.length > 0 || (editing && imagesSupported)) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {images.map((img) => (
              <Pressable key={img} onPress={() => setViewing(img)} accessibilityLabel="View image">
                <ImageThumb id={img} theme={theme} size={76} radius={12} />
              </Pressable>
            ))}
            {editing && imagesSupported && (
              <Pressable
                onPress={attach}
                disabled={attaching}
                accessibilityLabel="Attach image"
                style={[styles.addImage, { borderColor: theme.border, backgroundColor: theme.card }]}
              >
                {attaching ? (
                  <ActivityIndicator color={theme.textMuted} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={20} color={theme.textMuted} />
                    <Text style={[styles.addImageText, { color: theme.textMuted }]}>{images.length ? 'Add' : 'Attach image'}</Text>
                  </>
                )}
              </Pressable>
            )}
          </ScrollView>
        )}
        {images.length > 0 && (
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Images are for reference — copying only copies the text.
            {cloudFull ? ` Cloud image limit reached (${imageUsage?.limit}); new images stay on this phone.` : ''}
          </Text>
        )}

        {editing ? (
          <TextInput
            ref={bodyRef}
            value={draft.body}
            onChangeText={(body) => type({ body })}
            selection={selection}
            onSelectionChange={(e) => {
              selectionRef.current = e.nativeEvent.selection;
              if (selection) setSelection(undefined);
            }}
            placeholder={'Write your prompt…\n\nUse {{placeholders}} for parts you fill in later, or {{tone|friendly}} to give one a default.'}
            placeholderTextColor={theme.textMuted}
            style={[styles.body, { color: theme.text }]}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        ) : draft.body ? (
          <PromptText body={draft.body} theme={theme} />
        ) : (
          <Text style={[styles.emptyBody, { color: theme.textMuted }]}>No text yet. Tap Edit to write this prompt.</Text>
        )}

        {variables.length > 0 && (
          <View style={[styles.row, styles.wrap]}>
            <Ionicons name="code-slash" size={14} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, fontSize: font.footnote }}>Filled in when you copy:</Text>
            {variables.map((v) => (
              <View key={v} style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                <Text style={{ color: theme.text, fontSize: font.footnote }}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.footer, { color: theme.textMuted }]}>
          {words} words · {draft.body.length} chars
          {settings.showTokens && draft.body ? ` · ~${estimateTokens(draft.body)} tokens` : ''}
          {prompt && prompt.copyCount > 0 ? ` · copied ${prompt.copyCount}×` : ''}
        </Text>
      </ScrollView>

      <ImageViewer imageId={viewing} onClose={() => setViewing(null)} onRemove={editing ? removeImage : undefined} />

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        quick={
          prompt && aiApps.length > 0
            ? {
                label: 'Copy & open in',
                items: aiApps.map((a) => ({ key: a.key, label: a.label, leading: <AppBadge app={a} size={26} />, onPress: () => copy(prompt, { openIn: a }) })),
              }
            : undefined
        }
        actions={[
          {
            icon: 'time-outline',
            label: `Version history${id && history.versionsFor(id).length ? ` (${history.versionsFor(id).length})` : ''}`,
            onPress: () => id && router.push({ pathname: '/history/[id]', params: { id } }),
          },
          {
            label: 'Duplicate',
            icon: 'duplicate-outline',
            onPress: () => {
              const dup = id && store.duplicatePrompt(id);
              if (dup) router.replace({ pathname: '/prompt/[id]', params: { id: dup.id } });
            },
          },
          {
            label: 'Move to Trash',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => {
              if (!id) return;
              const trashed = id;
              store.deletePrompt(trashed);
              toast('Moved to Trash', { label: 'Undo', onPress: () => store.restorePrompt(trashed) });
              leave();
            },
          },
        ]}
      />
    </KeyboardSafe>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 16 },
  editText: { fontSize: font.body, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  title: { fontSize: font.largeTitle, fontWeight: '800', paddingVertical: 6, letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14 },
  tagInput: { minWidth: 80, fontSize: font.body, height: 28, paddingVertical: 0 },
  launch: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  launchTitle: { fontSize: font.body, fontWeight: '700' },
  launchSub: { fontSize: font.caption, marginTop: 1 },
  addImage: {
    width: 76,
    height: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addImageText: { fontSize: font.caption, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: font.caption, marginTop: -4 },
  body: { fontSize: font.headline, lineHeight: 24, minHeight: 280, paddingVertical: 8 },
  emptyBody: { fontSize: font.body, paddingVertical: 8, minHeight: 120 },
  folderDot: { width: 8, height: 8, borderRadius: 4 },
  footer: { fontSize: font.caption, textAlign: 'right' },
});
