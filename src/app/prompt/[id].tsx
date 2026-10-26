import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ActionSheet';
import { Chip } from '@/components/Chip';
import { extractVariables } from '@/lib/templates';
import { useTheme } from '@/lib/theme';
import { useCopyPrompt } from '@/lib/useCopyPrompt';
import { normalizeTag, usePromptStore } from '@/store/PromptStore';
import type { PromptDraft } from '@/store/types';

export default function PromptEditor() {
  const params = useLocalSearchParams<{ id: string; folderId?: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const store = usePromptStore();
  const copy = useCopyPrompt();

  // A new prompt only gets an id once the user types something, so backing out leaves nothing behind.
  const [id, setId] = useState<string | null>(params.id === 'new' ? null : params.id);
  const existing = id ? store.getPrompt(id) : undefined;

  const [draft, setDraft] = useState<PromptDraft>(() => ({
    title: existing?.title ?? '',
    body: existing?.body ?? '',
    folderId: existing?.folderId ?? params.folderId ?? null,
    tags: existing?.tags ?? [],
    pinned: existing?.pinned ?? false,
  }));
  const [tagInput, setTagInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const change = (patch: Partial<PromptDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (id) store.updatePrompt(id, patch);
    else if (next.title.trim() || next.body.trim()) setId(store.createPrompt(next).id);
  };

  // Clean up a prompt the user cleared out completely.
  const latest = useRef({ id, draft });
  useEffect(() => {
    latest.current = { id, draft };
  });
  useEffect(
    () => () => {
      const { id: lastId, draft: d } = latest.current;
      if (lastId && !d.title.trim() && !d.body.trim()) store.deletePrompt(lastId);
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

  const words = draft.body.trim() ? draft.body.trim().split(/\s+/).length : 0;
  const variables = extractVariables(draft.body);
  const prompt = id ? store.getPrompt(id) : undefined;

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
              <Pressable hitSlop={8} accessibilityLabel="Pin" onPress={() => change({ pinned: !draft.pinned })}>
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
          {store.folders.map((f) => (
            <Chip
              key={f.id}
              label={f.name}
              color={f.color}
              theme={theme}
              active={draft.folderId === f.id}
              onPress={() => change({ folderId: f.id })}
            />
          ))}
          <Chip label="+ New" theme={theme} onPress={() => router.push('/categories')} />
        </ScrollView>

        <View style={[styles.row, styles.tags]}>
          {draft.tags.map((t) => (
            <Pressable
              key={t}
              onPress={() => change({ tags: draft.tags.filter((x) => x !== t) })}
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

        <TextInput
          value={draft.body}
          onChangeText={(body) => change({ body })}
          placeholder="Write your prompt… Use {{placeholders}} for parts you fill in later."
          placeholderTextColor={theme.textMuted}
          style={[styles.body, { color: theme.text }]}
          multiline
          textAlignVertical="top"
          scrollEnabled={false}
        />

        {variables.length > 0 && (
          <View style={[styles.row, styles.tags]}>
            <Ionicons name="code-slash" size={14} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>Filled in when you copy:</Text>
            {variables.map((v) => (
              <View key={v} style={[styles.tag, { backgroundColor: theme.cardPinned }]}>
                <Text style={{ color: theme.text, fontSize: 13 }}>{v}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.footer, { color: theme.textMuted }]}>
          {words} words · {draft.body.length} chars
          {prompt && prompt.copyCount > 0 ? ` · copied ${prompt.copyCount}×` : ''}
        </Text>
      </ScrollView>

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={[
          {
            label: 'Duplicate',
            onPress: () => {
              const dup = id && store.duplicatePrompt(id);
              if (dup) router.replace({ pathname: '/prompt/[id]', params: { id: dup.id } });
            },
          },
          {
            label: 'Delete',
            destructive: true,
            onPress: () => {
              if (id) store.deletePrompt(id);
              if (router.canGoBack()) router.back();
              else router.replace('/');
            },
          },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: 18, paddingHorizontal: 4 },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tags: { flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14 },
  tagInput: { minWidth: 80, fontSize: 14, height: 28, paddingVertical: 0 },
  body: { fontSize: 16, lineHeight: 24, minHeight: 280, paddingVertical: 8 },
  footer: { fontSize: 12, textAlign: 'right' },
});
