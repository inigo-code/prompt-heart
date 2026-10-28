import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppBadge } from '@/components/AppBadge';
import { Achievements } from '@/components/profile/Achievements';
import { ActivityGraph, ActivityKey } from '@/components/profile/ActivityGraph';
import { Section } from '@/components/SettingsUI';
import { aiApp } from '@/lib/ai';
import { font } from '@/lib/theme';
import type { Theme } from '@/lib/theme';
import { useInsights } from '@/profile/useInsights';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** The profile's "how you use your prompts": numbers, your most-used four, a year of activity, badges. */
export function InsightsSection({ theme }: { theme: Theme }) {
  const data = useInsights();
  const maxCategory = data.topCategories[0]?.count ?? 1;
  const maxOpens = data.opens[0]?.count ?? 1;
  const unlocked = data.achievements.filter((a) => a.tier).length;

  return (
    <>
      <View style={styles.figures} accessibilityRole="summary">
        <Figure theme={theme} value={data.prompts} label={data.prompts === 1 ? 'prompt' : 'prompts'} />
        <Figure theme={theme} value={data.copies} label={data.copies === 1 ? 'copy' : 'copies'} />
        <Figure theme={theme} value={data.templates} label="with blanks" />
        <Figure theme={theme} value={data.currentStreak} label="day streak" accent />
      </View>

      <Section theme={theme} title="Your most-used four">
        {data.topFour.length ? (
          <View style={styles.four}>
            {data.topFour.map((p, i) => (
              <Pressable
                key={p.id}
                onPress={() => router.push({ pathname: '/prompt/[id]', params: { id: p.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${p.title}, copied ${plural(p.copies, 'time')}`}
                style={({ pressed }) => [styles.fourItem, { backgroundColor: i === 0 ? theme.accentSoft : theme.bg, opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={[styles.fourCount, { color: theme.text }]}>{p.copies}×</Text>
                <Text style={[styles.fourTitle, { color: theme.text }]} numberOfLines={2}>
                  {p.title}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={[styles.empty, { color: theme.textMuted }]}>Copy a prompt and it shows up here. The four you copy most stay on top.</Text>
        )}
      </Section>

      <Section
        theme={theme}
        title="A year of prompting"
        footer={`${plural(data.activeDays, 'active day')} · longest streak ${plural(data.longestStreak, 'day')}${
          data.busiestMonth ? ` · busiest month ${MONTH_NAMES[Number(data.busiestMonth.key.slice(5, 7)) - 1]}` : ''
        }. Saving, editing and copying all count.`}
      >
        <View style={styles.graph}>
          <ActivityGraph weeks={data.weeks} theme={theme} />
          <ActivityKey theme={theme} />
        </View>
      </Section>

      {data.topCategories.length > 0 && (
        <Section theme={theme} title="Top categories">
          <View style={styles.bars}>
            {data.topCategories.map((c) => (
              <Bar key={c.name} theme={theme} label={c.name} value={c.count} max={maxCategory} color={c.color} dot={c.color} />
            ))}
          </View>
        </Section>
      )}

      {data.opens.length > 0 && (
        <Section theme={theme} title="Where your prompts go" footer="Each “Copy & open” from this phone, counted from this version on.">
          <View style={styles.bars}>
            {data.opens.map((o) => {
              const app = aiApp(o.key);
              return <Bar key={o.key} theme={theme} label={app?.label ?? o.key} value={o.count} max={maxOpens} color={app?.color ?? theme.accent} leading={app ? <AppBadge app={app} size={22} /> : undefined} />;
            })}
          </View>
        </Section>
      )}

      <Section theme={theme} title={`Achievements · ${unlocked} of ${data.achievements.length}`}>
        <View style={styles.badges}>
          <Achievements list={data.achievements} theme={theme} />
        </View>
      </Section>
    </>
  );
}

function Figure({ theme, value, label, accent }: { theme: Theme; value: number; label: string; accent?: boolean }) {
  return (
    <View style={[styles.figure, { backgroundColor: accent ? theme.accentSoft : theme.card, borderColor: theme.border }]} accessible accessibilityLabel={`${value} ${label}`}>
      {accent && <Ionicons name="flame" size={14} color={theme.accent} />}
      <Text style={[styles.figureValue, { color: theme.text }]}>{value.toLocaleString()}</Text>
      <Text style={[styles.figureLabel, { color: theme.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Bar({ theme, label, value, max, color, dot, leading }: { theme: Theme; label: string; value: number; max: number; color: string; dot?: string; leading?: ReactNode }) {
  return (
    <View style={styles.bar} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.barHead}>
        {leading ?? (dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null)}
        <Text style={[styles.barLabel, { color: theme.text }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.barValue, { color: theme.textMuted }]}>{value}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.chip }]}>
        <View style={[styles.fill, { width: `${Math.max(4, Math.round((value / max) * 100))}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  figures: { flexDirection: 'row', gap: 8 },
  figure: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  figureValue: { fontSize: font.title, fontWeight: '800' },
  figureLabel: { fontSize: font.caption },
  four: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  fourItem: { width: '48.6%', minHeight: 88, borderRadius: 14, padding: 12, justifyContent: 'space-between', gap: 6 },
  fourCount: { fontSize: font.title, fontWeight: '800' },
  fourTitle: { fontSize: font.footnote, fontWeight: '700', lineHeight: 17 },
  empty: { fontSize: font.body, lineHeight: 21, padding: 16 },
  graph: { padding: 16, gap: 10 },
  bars: { padding: 16, gap: 14 },
  bar: { gap: 6 },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  barLabel: { flex: 1, fontSize: font.body, fontWeight: '700' },
  barValue: { fontSize: font.body, fontWeight: '700' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  badges: { padding: 12 },
});
