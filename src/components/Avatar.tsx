import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { Theme } from '@/lib/theme';

type Props = {
  theme: Theme;
  uri: string | null;
  name: string;
  size?: number;
  /** Small status dot in the corner (e.g. sync state). */
  dot?: string;
  /** Draw the dot as a ring (outline only), e.g. for changes waiting to sync. */
  dotRing?: boolean;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

/** Profile photo, or initials on the accent colour, or a person icon when there's no name. */
export function Avatar({ theme, uri, name, size = 36, dot, dotRing }: Props) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  const letters = initials(name);
  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={[box, { backgroundColor: theme.chip }]} />
      ) : (
        <View style={[box, styles.center, { backgroundColor: letters ? theme.accent : theme.chip }]}>
          {letters ? (
            <Text style={[styles.letters, { color: theme.accentText, fontSize: size * 0.4 }]}>{letters}</Text>
          ) : (
            <Ionicons name="person" size={size * 0.5} color={theme.textMuted} />
          )}
        </View>
      )}
      {dot && (
        <View
          style={[
            styles.dot,
            {
              // The ring is drawn larger so its hollow centre stays visible at phone size.
              width: size * (dotRing ? 0.42 : 0.32),
              height: size * (dotRing ? 0.42 : 0.32),
              borderRadius: size * (dotRing ? 0.21 : 0.16),
              backgroundColor: dotRing ? theme.bg : dot,
              borderColor: dotRing ? dot : theme.bg,
            },
            dotRing && styles.ring,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  letters: { fontWeight: '800', letterSpacing: -0.3 },
  dot: { position: 'absolute', right: -1, bottom: -1, borderWidth: 2 },
  ring: { borderWidth: 3.5, right: -3, bottom: -3 },
});
