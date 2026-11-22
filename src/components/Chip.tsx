import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/AppText';
import { font } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

type Props = {
  label: string;
  active?: boolean;
  /** Shown before the label, e.g. an AI app's badge. */
  leading?: ReactNode;
  /** "action" chips (like "+ New category") are outlined so they don't read as filters. Only a chosen filter is filled. */
  variant?: 'filter' | 'action';
  theme: Theme;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
};

export function Chip({ label, active, leading, variant = 'filter', theme, onPress, onLongPress, accessibilityLabel }: Props) {
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
          ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: `${theme.textMuted}66` }
          : { backgroundColor: active ? theme.chipActive : theme.chip },
        leading ? styles.withLeading : null,
        pressed && { opacity: 0.75 },
      ]}
    >
      {leading}
      <Text style={[styles.label, { color: active ? theme.chipActiveText : theme.text }]}>{label}</Text>
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
  withLeading: { paddingLeft: 5 },
  label: { fontSize: font.body, fontWeight: '600' },
});
