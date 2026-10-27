import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { font } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

type Props = {
  label: string;
  active?: boolean;
  color?: string;
  /** Replaces the colour dot, e.g. an AI app badge. */
  leading?: ReactNode;
  /** "action" chips (like "+ New category") are outlined so they don't read as filters. */
  variant?: 'filter' | 'action';
  theme: Theme;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
};

export function Chip({ label, active, color, leading, variant = 'filter', theme, onPress, onLongPress, accessibilityLabel }: Props) {
  const action = variant === 'action';
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={action ? undefined : { selected: !!active }}
      style={({ pressed }) => [
        styles.chip,
        action
          ? { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.accent }
          : { backgroundColor: active ? theme.chipActive : theme.chip },
        leading ? styles.withLeading : null,
        pressed && { opacity: 0.75 },
      ]}
    >
      {leading ?? (color && <View style={[styles.dot, { backgroundColor: color }]} />)}
      <Text style={[styles.label, { color: action ? theme.accent : active ? theme.chipActiveText : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 17,
  },
  withLeading: { paddingLeft: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: font.body, fontWeight: '600' },
});
