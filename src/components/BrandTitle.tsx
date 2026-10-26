import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { Theme } from '@/lib/theme';

// Loaded in the root layout; until it's ready the title falls back to the system font.
export const BRAND_FONT = 'Fredoka_700Bold';

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

// "Prompt Heart" in Fredoka Bold is about 6.1em wide, plus the heart (1.05em) and the gap.
const TITLE_EMS = 7.4;
const GAP = 6;

/**
 * "Prompt Heart" in the display font, with the heart beside it. Measures the space it's given and
 * picks a font size that fits (between `minSize` and `size`), so it never truncates on narrow phones.
 */
export function BrandTitle({
  theme,
  size = 32,
  minSize = 22,
  align = 'left',
}: {
  theme: Theme;
  size?: number;
  minSize?: number;
  align?: 'left' | 'center';
}) {
  const [width, setWidth] = useState(0);
  const fitted = width ? Math.max(minSize, Math.min(size, Math.floor((width - GAP) / TITLE_EMS))) : size;
  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="header"
      accessibilityLabel="Prompt Heart"
    >
      <View style={[styles.row, { alignSelf: align === 'center' ? 'center' : 'flex-start' }]}>
        <Text style={[styles.title, { color: theme.text, fontSize: fitted, lineHeight: fitted * 1.2 }]} numberOfLines={1}>
          Prompt <Text style={{ color: theme.accent }}>Heart</Text>
        </Text>
        <HeartMark theme={theme} size={fitted * 1.05} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  title: { fontFamily: BRAND_FONT, letterSpacing: -0.3 },
});
