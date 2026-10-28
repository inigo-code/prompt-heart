import { forwardRef } from 'react';
import type { ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BRAND_FONT, HeartMark } from '@/components/BrandTitle';
import type { Theme } from '@/lib/theme';
import type { Insights } from '@/profile/insights';

/** Drawn at this size and captured at three times it: 1080 × 1920, the size of a story. */
export const CARD_W = 360;
export const CARD_H = 640;

type Props = { theme: Theme; name: string; bio: string; photo: string | null; stats: Insights };

/** Your profile as a story-sized card: photo, name, bio, the four prompts you use most and your numbers. */
export const ProfileCard = forwardRef<ComponentRef<typeof View>, Props>(function ProfileCard({ theme, name, bio, photo, stats }, ref) {
  const numbers = [
    { value: stats.prompts, label: stats.prompts === 1 ? 'prompt' : 'prompts' },
    { value: stats.copies, label: stats.copies === 1 ? 'copy' : 'copies' },
    { value: stats.templates, label: 'with blanks' },
    { value: stats.longestStreak, label: 'day best streak' },
  ];
  const four = Array.from({ length: 4 }, (_, i) => stats.topFour[i]);
  const unlocked = stats.achievements.filter((a) => a.tier).length;

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: theme.bg }]}>
      {/* The round end of a placeholder chip, in the accent, behind the photo. */}
      <View style={[styles.arc, { backgroundColor: theme.accent }]} />
      <Text style={[styles.kicker, { color: theme.accentText }]}>My prompts</Text>
      <View style={[styles.photo, { borderColor: theme.bg }]}>
        <Avatar theme={theme} uri={photo} name={name || 'Prompt Heart'} size={104} />
      </View>
      <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
        {name.trim() || 'Prompt Heart'}
      </Text>
      {!!bio.trim() && (
        <Text style={[styles.bio, { color: theme.textMuted }]} numberOfLines={2}>
          {bio.trim()}
        </Text>
      )}

      <Text style={[styles.caption, { color: theme.textMuted }]}>The four I use most</Text>
      <View style={styles.four}>
        {four.map((p, i) => (
          <View key={i} style={[styles.note, { backgroundColor: i === 0 ? theme.accentSoft : theme.card, borderColor: theme.border }]}>
            {p ? (
              <>
                <Text style={[styles.noteCount, { color: theme.text }]}>{p.copies}×</Text>
                <Text style={[styles.noteTitle, { color: theme.text }]} numberOfLines={2}>
                  {p.title}
                </Text>
              </>
            ) : (
              <Text style={[styles.noteEmpty, { color: theme.textMuted }]}>{'{{ }}'}</Text>
            )}
          </View>
        ))}
      </View>

      <View style={styles.numbers}>
        {numbers.map((n) => (
          <View key={n.label} style={styles.number}>
            <Text style={[styles.value, { color: theme.text }]}>{n.value.toLocaleString()}</Text>
            <Text style={[styles.label, { color: theme.textMuted }]} numberOfLines={2}>
              {n.label}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.line, { color: theme.textMuted }]}>
        {stats.activeDays} active {stats.activeDays === 1 ? 'day' : 'days'} · {unlocked} of {stats.achievements.length} achievements
      </Text>

      <View style={styles.brand}>
        <HeartMark theme={theme} size={22} />
        <Text style={[styles.brandText, { color: theme.text }]}>
          Prompt <Text style={{ color: theme.accent }}>Heart</Text>
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: CARD_W, height: CARD_H, overflow: 'hidden', alignItems: 'center', paddingHorizontal: 22 },
  arc: { position: 'absolute', top: -260, width: 520, height: 420, borderRadius: 260 },
  kicker: { marginTop: 34, fontFamily: BRAND_FONT, fontSize: 15 },
  photo: { marginTop: 22, borderRadius: 60, borderWidth: 6 },
  name: { fontFamily: BRAND_FONT, fontSize: 30, marginTop: 12, letterSpacing: -0.3 },
  bio: { fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 2, maxWidth: 280 },
  caption: { fontSize: 12, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  four: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'stretch' },
  note: { width: 154, height: 78, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 10, justifyContent: 'space-between' },
  noteCount: { fontFamily: BRAND_FONT, fontSize: 20 },
  noteTitle: { fontSize: 12, fontWeight: '700', lineHeight: 15 },
  noteEmpty: { fontFamily: BRAND_FONT, fontSize: 20, alignSelf: 'center', marginTop: 16 },
  numbers: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 24 },
  number: { flex: 1, alignItems: 'center' },
  value: { fontFamily: BRAND_FONT, fontSize: 28 },
  label: { fontSize: 11, textAlign: 'center' },
  line: { fontSize: 11, marginTop: 14 },
  brand: { position: 'absolute', bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandText: { fontFamily: BRAND_FONT, fontSize: 16 },
});
