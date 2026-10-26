import { StyleSheet, Text, View } from 'react-native';

import type { AiApp } from '@/lib/ai';

/** Round brand-coloured chip with the app's short name, e.g. "Cl" for Claude. */
export function AppBadge({ app, size = 28 }: { app: AiApp; size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: app.color }]}>
      <Text style={[styles.text, { fontSize: size * (app.badge.length > 2 ? 0.32 : 0.4) }]} numberOfLines={1}>
        {app.badge}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  text: { color: '#fff', fontWeight: '800', letterSpacing: -0.3 },
});
