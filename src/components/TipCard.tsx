import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { font } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

type Props = {
  theme: Theme;
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  onDismiss: () => void;
  action?: { label: string; onPress: () => void };
};

/** A dismissible hint card, shown once to help new users discover a feature. */
export function TipCard({ theme, icon, title, children, onDismiss, action }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: theme.accentSoft, borderColor: theme.accent + '55' }]}>
      <View style={styles.head}>
        {icon ?? <Ionicons name="bulb-outline" size={18} color={theme.text} />}
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Pressable onPress={onDismiss} hitSlop={10} accessibilityLabel="Dismiss tip">
          <Ionicons name="close" size={18} color={theme.textMuted} />
        </Pressable>
      </View>
      <Text style={[styles.body, { color: theme.text }]}>{children}</Text>
      <View style={styles.actions}>
        {action && (
          <Pressable onPress={action.onPress} style={[styles.btn, { borderColor: theme.text + '33' }]}>
            <Text style={[styles.btnText, { color: theme.text }]}>{action.label}</Text>
          </Pressable>
        )}
        <Pressable onPress={onDismiss} style={[styles.btn, { backgroundColor: theme.text, borderColor: theme.text }]}>
          <Text style={[styles.btnText, { color: theme.bg }]}>Got it</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8, marginBottom: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: font.body, fontWeight: '800' },
  body: { fontSize: font.footnote, lineHeight: 19 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 2 },
  btn: { paddingHorizontal: 16, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: font.footnote, fontWeight: '700' },
});
