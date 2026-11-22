import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import type { Theme } from '@/lib/theme';

// The launcher icon itself (assets/icon.png, scaled down), so the app shows the same mark as the phone's home screen.
const ICON = require('../../assets/brand/app-icon.png');

/** The app icon, with the corner rounding Android gives launcher icons. */
export function AppMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={ICON}
      style={{ width: size, height: size, borderRadius: size * 0.24 }}
      accessibilityIgnoresInvertColors
      accessible={false}
    />
  );
}

/** "Prompt Heart" beside the app icon, in the app's own type. */
export function BrandTitle({ theme, size = 24, align = 'left' }: { theme: Theme; size?: number; align?: 'left' | 'center' }) {
  return (
    <View
      style={[styles.row, { alignSelf: align === 'center' ? 'center' : 'flex-start' }]}
      accessibilityRole="header"
      accessibilityLabel="Prompt Heart"
    >
      <AppMark size={Math.round(size * 1.25)} />
      <Text style={[styles.title, { color: theme.text, fontSize: size, lineHeight: Math.round(size * 1.2) }]} numberOfLines={1}>
        Prompt Heart
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  title: { fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 },
});
