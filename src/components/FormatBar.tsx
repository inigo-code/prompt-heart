import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { FormatKind } from '@/lib/format';
import type { Theme } from '@/lib/theme';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;

const TOOLS: { kind: FormatKind; icon: Icon; label: string }[] = [
  { kind: 'bold', icon: 'format-bold', label: 'Bold' },
  { kind: 'italic', icon: 'format-italic', label: 'Italic' },
  { kind: 'heading', icon: 'format-header-pound', label: 'Heading' },
  { kind: 'bullet', icon: 'format-list-bulleted', label: 'Bulleted list' },
  { kind: 'numbered', icon: 'format-list-numbered', label: 'Numbered list' },
  { kind: 'quote', icon: 'format-quote-close', label: 'Quote' },
  { kind: 'code', icon: 'code-tags', label: 'Code' },
  { kind: 'placeholder', icon: 'code-braces', label: 'Placeholder to fill in' },
];

type Props = {
  theme: Theme;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFormat: (kind: FormatKind) => void;
};

/** The editing toolbar: undo/redo, then Markdown formatting for the prompt text. */
export function FormatBar({ theme, canUndo, canRedo, onUndo, onRedo, onFormat }: Props) {
  const tool = (key: string, icon: Icon, label: string, onPress: () => void, disabled = false) => (
    <Pressable
      key={key}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.tool, pressed && { backgroundColor: theme.chip }]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={disabled ? theme.border : theme.text} />
    </Pressable>
  );

  return (
    <View style={[styles.bar, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.row}>
        {tool('undo', 'undo', 'Undo', onUndo, !canUndo)}
        {tool('redo', 'redo', 'Redo', onRedo, !canRedo)}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        {TOOLS.map((t) => tool(t.kind, t.icon, t.label, () => onFormat(t.kind)))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 2 },
  tool: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  divider: { width: StyleSheet.hairlineWidth, height: 24, marginHorizontal: 6 },
});
