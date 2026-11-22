import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import type { Theme } from '@/lib/theme';

type Props = {
  theme: Theme;
  uri: string | null;
  name: string;
  size?: number;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

/** Profile photo, or initials, or a person icon when there's no name. */
export function Avatar({ theme, uri, name, size = 36 }: Props) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  const letters = initials(name);
  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={[box, { backgroundColor: theme.chip }]} />
      ) : (
        <View style={[box, styles.center, { backgroundColor: theme.chip }]}>
          {letters ? (
            <Text style={[styles.letters, { color: theme.text, fontSize: size * 0.4 }]}>{letters}</Text>
          ) : (
            <Ionicons name="person" size={size * 0.5} color={theme.textMuted} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  letters: { fontWeight: '800', letterSpacing: -0.3 },
});
