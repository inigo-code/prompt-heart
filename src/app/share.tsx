import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { useToast } from '@/components/Toast';
import { APP_NAME } from '@/lib/app';
import { saveImage } from '@/lib/images';
import { useTheme } from '@/lib/theme';
import { usePromptStore } from '@/store/PromptStore';

/** A short title from shared text: page title, else the first line. */
function suggestTitle(text: string, pageTitle?: string) {
  if (pageTitle) return pageTitle.slice(0, 80);
  const first = text.split('\n').find((l) => l.trim())?.trim() ?? '';
  return first.length > 60 ? `${first.slice(0, 57)}…` : first;
}

// Opened when text, a link or images are shared to the app from another app (see +native-intent.ts).
export default function ShareScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { folders, createPrompt } = usePromptStore();
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntentContext();

  const sharedText = [shareIntent.text, shareIntent.webUrl && !shareIntent.text?.includes(shareIntent.webUrl) ? shareIntent.webUrl : null]
    .filter(Boolean)
    .join('\n\n');
  const sharedImages = (shareIntent.files ?? []).filter((f) => f.mimeType?.startsWith('image/'));

  const [title, setTitle] = useState(() => suggestTitle(sharedText, shareIntent.meta?.title));
  const [body, setBody] = useState(sharedText);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // If the app was already open, the shared content can arrive after this screen first renders.
  const [filledFrom, setFilledFrom] = useState(sharedText);
  if (sharedText && sharedText !== filledFrom) {
    setFilledFrom(sharedText);
    setBody(sharedText);
    setTitle(suggestTitle(sharedText, shareIntent.meta?.title));
  }

  const done = () => {
    resetShareIntent();
    router.replace('/');
  };

  const save = async () => {
    setSaving(true);
    try {
      const images: string[] = [];
      for (const f of sharedImages) images.push(await saveImage(f.path));
      const prompt = createPrompt({ title: title.trim(), body, folderId, images });
      resetShareIntent();
      toast('Saved to ' + APP_NAME);
      router.replace({ pathname: '/prompt/[id]', params: { id: prompt.id } });
    } catch (e) {
      toast(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  };

  if (!hasShareIntent && !sharedText && sharedImages.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Stack.Screen options={{ title: 'Save to ' + APP_NAME }} />
        <Ionicons name="share-outline" size={36} color={theme.textMuted} />
        <Text style={[styles.muted, { color: theme.textMuted }]}>
          {error ? `Couldn't read what was shared: ${error}` : `Nothing was shared. Use Share → ${APP_NAME} in another app.`}
        </Text>
        <Pressable onPress={() => router.replace('/')} style={[styles.secondary, { backgroundColor: theme.chip }]}>
          <Text style={[styles.btnText, { color: theme.text }]}>Go to prompts</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Save to ' + APP_NAME }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={theme.textMuted}
          style={[styles.title, { color: theme.text }]}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          <Chip label="No category" theme={theme} active={folderId === null} onPress={() => setFolderId(null)} />
          {folders.map((f) => (
            <Chip key={f.id} label={f.name} color={f.color} theme={theme} active={folderId === f.id} onPress={() => setFolderId(f.id)} />
          ))}
        </ScrollView>

        {sharedImages.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {sharedImages.map((f) => (
              <Image key={f.path} source={{ uri: f.path }} style={[styles.thumb, { backgroundColor: theme.chip }]} />
            ))}
          </ScrollView>
        )}

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Prompt text"
          placeholderTextColor={theme.textMuted}
          style={[styles.body, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
          multiline
          textAlignVertical="top"
        />

        <View style={styles.actions}>
          <Pressable onPress={done} style={[styles.secondary, { backgroundColor: theme.chip }]}>
            <Text style={[styles.btnText, { color: theme.text }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={save}
            disabled={saving || (!body.trim() && !title.trim() && sharedImages.length === 0)}
            style={[styles.primary, { backgroundColor: theme.accent }]}
          >
            {saving ? <ActivityIndicator color={theme.accentText} /> : <Text style={[styles.btnText, { color: theme.accentText }]}>Save prompt</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  muted: { fontSize: 15, textAlign: 'center' },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 96, height: 96, borderRadius: 12 },
  body: { minHeight: 200, fontSize: 15, lineHeight: 22, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  actions: { flexDirection: 'row', gap: 10 },
  secondary: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primary: { flex: 2, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
});
