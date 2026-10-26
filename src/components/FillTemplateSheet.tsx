import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fillTemplate } from '@/lib/templates';
import { useTheme } from '@/lib/theme';
import type { Prompt } from '@/store/types';

type Props = {
  prompt: Prompt;
  variables: string[];
  initialValues: Record<string, string>;
  onCopy: (text: string, values: Record<string, string>) => void;
  onClose: () => void;
};

// Mounted fresh for each copy, so its state always starts from initialValues.
export function FillTemplateSheet({ prompt, variables, initialValues, onCopy, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState(initialValues);

  const filled = fillTemplate(prompt.body, values);
  const remaining = variables.filter((v) => !values[v]?.length).length;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {prompt.title || 'Untitled'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Fill in the blanks, then copy.</Text>

          <ScrollView style={styles.fields} contentContainerStyle={styles.fieldsContent} keyboardShouldPersistTaps="handled">
            {variables.map((name, i) => (
              <View key={name} style={styles.field}>
                <Text style={[styles.label, { color: theme.textMuted }]}>{name}</Text>
                <TextInput
                  value={values[name] ?? ''}
                  onChangeText={(v) => setValues((prev) => ({ ...prev, [name]: v }))}
                  placeholder={`Enter ${name}`}
                  placeholderTextColor={theme.textMuted}
                  autoFocus={i === 0}
                  multiline
                  style={[styles.input, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
                />
              </View>
            ))}

            <Text style={[styles.label, { color: theme.textMuted }]}>Preview</Text>
            <Text style={[styles.preview, { color: theme.text, backgroundColor: theme.bg }]} numberOfLines={8}>
              {filled}
            </Text>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={() => onCopy(prompt.body, values)}
              style={[styles.btn, { backgroundColor: theme.chip }]}
              accessibilityLabel="Copy template without filling"
            >
              <Text style={[styles.btnText, { color: theme.text }]}>Copy as-is</Text>
            </Pressable>
            <Pressable
              onPress={() => onCopy(filled, values)}
              style={[styles.btn, styles.primary, { backgroundColor: theme.accent }]}
              accessibilityLabel="Copy filled prompt"
            >
              <Text style={[styles.btnText, { color: theme.accentText }]}>
                {remaining > 0 ? `Copy (${remaining} blank)` : 'Copy'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2, marginBottom: 12 },
  fields: { flexGrow: 0 },
  fieldsContent: { gap: 12, paddingBottom: 12 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontSize: 15, minHeight: 44, maxHeight: 140, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10 },
  preview: { fontSize: 14, lineHeight: 20, borderRadius: 12, padding: 12 },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  btn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primary: { flex: 1.6 },
  btnText: { fontSize: 15, fontWeight: '700' },
});
