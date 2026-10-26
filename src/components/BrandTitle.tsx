import { Image, StyleSheet, Text, View } from 'react-native';

import type { Theme } from '@/lib/theme';

// Loaded in the root layout; until it's ready the title falls back to the system font.
export const BRAND_FONT = 'Fraunces_700Bold_Italic';

const HEARTS = {
  light: require('../../assets/brand/heart-light.png'),
  dark: require('../../assets/brand/heart-dark.png'),
};

/** The smiling heart: wide awake in light mode, sleepy and content (with a star) in dark mode. */
export function HeartMark({ theme, size = 34 }: { theme: Theme; size?: number }) {
  return (
    <Image
      source={theme.dark ? HEARTS.dark : HEARTS.light}
      style={{ width: size, height: size }}
      accessibilityIgnoresInvertColors
      accessible={false}
    />
  );
}

/** "Prompt Heart" set in the display font, with the heart beside it. */
export function BrandTitle({ theme, size = 32 }: { theme: Theme; size?: number }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Prompt Heart">
      <Text style={[styles.title, { color: theme.text, fontSize: size, lineHeight: size * 1.2 }]} numberOfLines={1}>
        Prompt <Text style={{ color: theme.accent }}>Heart</Text>
      </Text>
      <HeartMark theme={theme} size={size * 1.1} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: BRAND_FONT, letterSpacing: -0.5 },
});
