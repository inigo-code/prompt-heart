import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ActionSheet';
import { AppBadge } from '@/components/AppBadge';
import { Chip } from '@/components/Chip';
import { ImageThumb } from '@/components/ImageThumb';
import { ImageViewer } from '@/components/ImageViewer';
import { useToast } from '@/components/Toast';
import { deleteLocalImage, imagesSupported, pickImages } from '@/lib/images';
import { estimateTokens, extractVariables } from '@/lib/templates';
import { useTheme } from '@/lib/theme';
import { useEnabledAiApps, useLaunchApp, useVisibleFolders } from '@/lib/useAiApps';
import { useCopyPrompt } from '@/lib/useCopyPrompt';
import { useSettings } from '@/settings/SettingsProvider';
import { normalizeTag, usePromptStore } from '@/store/PromptStore';
import type { PromptDraft } from '@/store/types';

type TextDraft = Omit<PromptDraft, 'images'>;

export default function PromptEditor() {
  const params = useLocalSearchParams<{ id: string; folderId?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { settings } = useSettings();
  const store = usePromptStore();
  const copy = useCopyPrompt();
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

  // Images are edited straight in the store (they aren't typed), so read them from there.
  const prompt = id ? store.getPrompt(id) : undefined;
  const images = prompt?.images ?? [];
  const launchApp = useLaunchApp(draft.folderId);

  const change = (patch: Partial<TextDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (id) store.updatePrompt(id, patch);
    else if (next.title.trim() || next.body.trim()) setId(store.createPrompt(next).id);
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

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <TextInput
          value={draft.title}
          onChangeText={(title) => change({ title })}
          placeholder="Title"
          placeholderTextColor={theme.textMuted}
          style={[styles.title, { color: theme.text }]}
          autoFocus={params.id === 'new'}
        />

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

        <View style={[styles.row, styles.wrap]}>
          {draft.tags.map((t) => (
            <Pressable
              key={t}
              onPress={() => change({ tags: draft.tags.filter((x) => x !== t) })}
              accessibilityLabel={`Remove tag ${t}`}
              style={[styles.tag, { backgroundColor: theme.chip }]}
            >
              <Text style={{ color: theme.text, fontSize: 13 }}>#{t}</Text>
              <Ionicons name="close" size={13} color={theme.textMuted} />
            </Pressable>
          ))}
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
        </View>

        {(images.length > 0 || imagesSupported) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {images.map((img) => (
              <Pressable key={img} onPress={() => setViewing(img)} accessibilityLabel="View image">
                <ImageThumb id={img} theme={theme} size={76} radius={12} />
              </Pressable>
            ))}
            {imagesSupported && (
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
          <Text style={[styles.hint, { color: theme.textMuted }]}>Images are for reference — copying only copies the text.</Text>
        )}

        <TextInput
          value={draft.body}
          onChangeText={(body) => change({ body })}
          placeholder={'Write your prompt…\n\nUse {{placeholders}} for parts you fill in later, or {{tone|friendly}} to give one a default.'}
          placeholderTextColor={theme.textMuted}
          style={[styles.body, { color: theme.text }]}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />

        {variables.length > 0 && (
          <View style={[styles.row, styles.wrap]}>
            <Ionicons name="code-slash" size={14} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>Filled in when you copy:</Text>
            {variables.map((v) => (
              <View key={v} style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                <Text style={{ color: theme.text, fontSize: 13 }}>{v}</Text>
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

      <ImageViewer imageId={viewing} onClose={() => setViewing(null)} onRemove={removeImage} />

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={[
          ...(prompt ? aiApps.map((a) => ({ label: `Copy & open in ${a.label}`, onPress: () => copy(prompt, { openIn: a }) })) : []),
          {
            label: 'Duplicate',
            onPress: () => {
              const dup = id && store.duplicatePrompt(id);
              if (dup) router.replace({ pathname: '/prompt/[id]', params: { id: dup.id } });
            },
          },
          {
            label: 'Move to Trash',
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 4 },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', paddingVertical: 6, letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14 },
  tagInput: { minWidth: 80, fontSize: 14, height: 28, paddingVertical: 0 },
  launch: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  launchTitle: { fontSize: 15, fontWeight: '700' },
  launchSub: { fontSize: 12, marginTop: 1 },
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
  addImageText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: 12, marginTop: -4 },
  body: { fontSize: 16, lineHeight: 24, minHeight: 280, paddingVertical: 8 },
  footer: { fontSize: 12, textAlign: 'right' },
});
