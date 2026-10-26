import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme';
import { normalizeTag } from '@/store/PromptStore';

type Props = {
  visible: boolean;
  /** e.g. "Tag 3 prompts" */
  title: string;
  existingTags: string[];
  onAdd: (tag: string) => void;
  onClose: () => void;
};

/** Bottom sheet to add one tag: type a new one or tap an existing tag. */
export function TagSheet({ visible, title, existingTags, onAdd, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const tag = normalizeTag(text);

  const add = (t: string) => {
    onAdd(t);
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 16 }]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => tag && add(tag)}
              placeholder="New tag, e.g. email"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              style={[styles.input, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
            />
            <Pressable
              onPress={() => tag && add(tag)}
              disabled={!tag}
              style={[styles.addBtn, { backgroundColor: theme.accent, opacity: tag ? 1 : 0.5 }]}
            >
              <Text style={[styles.addText, { color: theme.accentText }]}>Add</Text>
            </Pressable>
          </View>
          {existingTags.length > 0 && (
            <>
              <Text style={[styles.label, { color: theme.textMuted }]}>Or pick one</Text>
              <ScrollView style={{ maxHeight: 160 }} contentContainerStyle={styles.tags}>
                {existingTags.map((t) => (
                  <Pressable key={t} onPress={() => add(t)} style={[styles.tag, { backgroundColor: theme.chip }]}>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>#{t}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, gap: 12 },
  title: { fontSize: 17, fontWeight: '800' },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, fontSize: 15, height: 46, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  addBtn: { height: 46, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center' },
});
