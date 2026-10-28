import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { TIER_COLORS } from '@/profile/insights';
import type { Achievement } from '@/profile/insights';
import { font } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

const TIER_NAMES = { wood: 'Wood', iron: 'Iron', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' } as const;

/** Badges in two columns: unlocked ones in their tier's colour, locked ones with progress to the first tier. */
export function Achievements({ list, theme }: { list: Achievement[]; theme: Theme }) {
  return (
    <View style={styles.grid}>
      {list.map((a) => {
        const metal = a.tier ? TIER_COLORS[a.tier] : theme.textMuted;
        const done = a.tier === 'platinum';
        const label = `${a.name}: ${a.tier ? `${TIER_NAMES[a.tier]} reached. ` : 'Locked. '}${done ? 'Every tier unlocked.' : `Next: ${a.goal}, ${a.progress} of ${a.next}.`}`;
        return (
          <View key={a.id} style={[styles.badge, { backgroundColor: theme.card, borderColor: a.tier ? metal + '88' : theme.border }]} accessible accessibilityLabel={label}>
            <View style={styles.top}>
              <View style={[styles.medal, { backgroundColor: a.tier ? metal + '2E' : theme.chip }]}>
                <Ionicons name={(a.tier ? a.icon : 'lock-closed') as keyof typeof Ionicons.glyphMap} size={18} color={a.tier ? metal : theme.textMuted} />
              </View>
              {a.tier && <Text style={[styles.tier, { color: metal }]}>{TIER_NAMES[a.tier]}</Text>}
            </View>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {a.name}
            </Text>
            <Text style={[styles.goal, { color: theme.textMuted }]} numberOfLines={2}>
              {done ? 'Every tier unlocked' : a.goal}
            </Text>
            {!done && (
              <View style={[styles.track, { backgroundColor: theme.chip }]}>
                <View style={[styles.fill, { width: `${Math.round((a.progress / a.next) * 100)}%`, backgroundColor: a.tier ? metal : theme.accent }]} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '48.4%', borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  medal: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tier: { fontSize: font.caption, fontWeight: '800' },
  name: { fontSize: font.body, fontWeight: '800' },
  goal: { fontSize: font.caption, lineHeight: 16, minHeight: 32 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  fill: { height: '100%', borderRadius: 3 },
});
