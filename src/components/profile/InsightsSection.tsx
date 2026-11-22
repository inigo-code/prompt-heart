import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { AppBadge } from '@/components/AppBadge';
import { Row, Section } from '@/components/SettingsUI';
import { aiApp } from '@/lib/ai';
import { font } from '@/lib/theme';
import type { Theme } from '@/lib/theme';
import { useInsights } from '@/profile/useInsights';

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** The profile's "how you use your prompts": plain numbers, the prompts you copy most, and where they go. */
export function InsightsSection({ theme }: { theme: Theme }) {
  const data = useInsights();
  const maxCategory = data.topCategories[0]?.count ?? 1;
  const maxOpens = data.opens[0]?.count ?? 1;

  return (
    <>
      <Section theme={theme} title="Your prompts">
        <Row theme={theme} label="Prompts" value={data.prompts.toLocaleString()} />
        <Row theme={theme} label="Times copied" value={data.copies.toLocaleString()} />
        <Row theme={theme} label="With blanks to fill" value={data.templates.toLocaleString()} />
        <Row theme={theme} label="Active days in the last year" value={data.activeDays.toLocaleString()} last={data.longestStreak < 2} />
        {data.longestStreak >= 2 && <Row theme={theme} label="Most days in a row" value={plural(data.longestStreak, 'day')} last />}
      </Section>

      <Section theme={theme} title="Copied most">
        {data.topFour.length ? (
          data.topFour.map((p, i) => (
            <Row
              key={p.id}
              theme={theme}
              label={p.title || 'Untitled'}
              value={`${p.copies.toLocaleString()}×`}
              onPress={() => router.push({ pathname: '/prompt/[id]', params: { id: p.id } })}
              last={i === data.topFour.length - 1}
            />
          ))
        ) : (
          <Row theme={theme} label="Copy a prompt and it shows up here" last />
        )}
      </Section>

      {data.topCategories.length > 0 && (
        <Section theme={theme} title="Top categories">
          <View style={styles.bars}>
            {data.topCategories.map((c) => (
              <Bar key={c.name} theme={theme} label={c.name} value={c.count} max={maxCategory} />
            ))}
          </View>
        </Section>
      )}

      {data.opens.length > 0 && (
        <Section theme={theme} title="Where your prompts go">
          <View style={styles.bars}>
            {data.opens.map((o) => {
              const app = aiApp(o.key);
              return (
                <Bar
                  key={o.key}
                  theme={theme}
                  label={app?.label ?? o.key}
                  value={o.count}
                  max={maxOpens}
                  leading={app ? <AppBadge app={app} size={22} /> : undefined}
                />
              );
            })}
          </View>
        </Section>
      )}
    </>
  );
}

function Bar({ theme, label, value, max, leading }: { theme: Theme; label: string; value: number; max: number; leading?: ReactNode }) {
  return (
    <View style={styles.bar} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.barHead}>
        {leading}
        <Text style={[styles.barLabel, { color: theme.text }]} numberOfLines={2}>
          {label}
        </Text>
        <Text style={[styles.barValue, { color: theme.textMuted }]}>{value.toLocaleString()}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.chip }]}>
        <View style={[styles.fill, { width: `${Math.max(3, Math.round((value / max) * 100))}%`, backgroundColor: theme.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { padding: 16, gap: 16 },
  bar: { gap: 8 },
  barHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { flex: 1, fontSize: font.body, fontWeight: '600' },
  barValue: { fontSize: font.body, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
