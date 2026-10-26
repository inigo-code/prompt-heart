import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Theme } from '@/lib/theme';

type Props = {
  label: string;
  active?: boolean;
  color?: string;
  theme: Theme;
  onPress: () => void;
  onLongPress?: () => void;
};

export function Chip({ label, active, color, theme, onPress, onLongPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.chip, { backgroundColor: active ? theme.chipActive : theme.chip }]}
    >
      {color && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.label, { color: active ? theme.chipActiveText : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 14, fontWeight: '600' },
});
