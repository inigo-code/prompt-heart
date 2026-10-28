import { useRef } from 'react';
import type { ComponentRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Insights } from '@/profile/insights';
import { font } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

const CELL = 12;
const GAP = 3;
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const shades = (theme: Theme) => [theme.chip, theme.accent + '5C', theme.accent + 'A6', theme.accent];
const level = (n: number) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : 3);

/** A year of prompting, one square a day, darker for busier days; it opens scrolled to this week. */
export function ActivityGraph({ weeks, theme }: { weeks: Insights['weeks']; theme: Theme }) {
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const shade = shades(theme);

  return (
    <View style={styles.wrap}>
      <View style={styles.days}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={[styles.dayLabel, { color: theme.textMuted }]}>
            {d}
          </Text>
        ))}
      </View>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
      >
        <View>
          <View style={styles.months}>
            {weeks.map((w, i) => {
              const starts = i === 0 || w[0].date.slice(5, 7) !== weeks[i - 1][0].date.slice(5, 7);
              return (
                <Text key={w[0].date} style={[styles.monthLabel, { color: theme.textMuted }]} numberOfLines={1}>
                  {starts && i < weeks.length - 1 ? MONTHS[Number(w[0].date.slice(5, 7)) - 1] : ''}
                </Text>
              );
            })}
          </View>
          <View style={styles.grid}>
            {weeks.map((w) => (
              <View key={w[0].date} style={styles.week}>
                {w.map((d) => (
                  <View
                    key={d.date}
                    accessibilityLabel={d.count ? `${d.date}: ${d.count} things done` : undefined}
                    style={[styles.cell, { backgroundColor: d.future ? 'transparent' : shade[level(d.count)] }]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** The key under the graph: less to more. */
export function ActivityKey({ theme }: { theme: Theme }) {
  return (
    <View style={styles.key} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={[styles.keyText, { color: theme.textMuted }]}>Less</Text>
      {shades(theme).map((c) => (
        <View key={c} style={[styles.cell, { backgroundColor: c }]} />
      ))}
      <Text style={[styles.keyText, { color: theme.textMuted }]}>More</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 6 },
  days: { paddingTop: 18, gap: GAP },
  dayLabel: { height: CELL, fontSize: 10, lineHeight: CELL },
  months: { flexDirection: 'row', gap: GAP, height: 16 },
  monthLabel: { width: CELL, fontSize: 10, overflow: 'visible' },
  grid: { flexDirection: 'row', gap: GAP, marginTop: 2 },
  week: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  keyText: { fontSize: font.caption },
});
