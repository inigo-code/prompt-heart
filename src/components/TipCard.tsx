import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { font } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

type Props = {
  theme: Theme;
  title: string;
  children: ReactNode;
  onDismiss: () => void;
  action?: { label: string; onPress: () => void };
};

/** A dismissible hint, shown once to help new users find a feature. Text buttons, the way Material banners work. */
export function TipCard({ theme, title, children, onDismiss, action }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>{children}</Text>
      <View style={styles.actions}>
        <Pressable onPress={onDismiss} hitSlop={{ top: 4, bottom: 4 }} accessibilityRole="button" style={({ pressed }) => [styles.btn, pressed && { backgroundColor: theme.chip }]}>
          <Text style={[styles.btnText, { color: theme.textMuted }]}>Got it</Text>
        </Pressable>
        {action && (
          <Pressable onPress={action.onPress} hitSlop={{ top: 4, bottom: 4 }} accessibilityRole="button" style={({ pressed }) => [styles.btn, pressed && { backgroundColor: theme.chip }]}>
            <Text style={[styles.btnText, { color: theme.accentInk }]}>{action.label}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 6, gap: 4, marginBottom: 4 },
  title: { fontSize: font.body, fontWeight: '700' },
  body: { fontSize: font.footnote, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginRight: -8 },
  btn: { height: 40, paddingHorizontal: 12, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: font.footnote, fontWeight: '700' },
});
