import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { Theme } from '@/lib/theme';

// Small building blocks for settings-style screens.

export function Section({ theme, title, children, footer }: { theme: Theme; title: string; children: ReactNode; footer?: string }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
      <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>{children}</View>
      {footer && <Text style={[styles.footer, { color: theme.textMuted }]}>{footer}</Text>}
    </View>
  );
}

type RowProps = {
  theme: Theme;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Replaces the icon, e.g. an app badge. */
  leading?: ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  busy?: boolean;
  destructive?: boolean;
  last?: boolean;
  right?: ReactNode;
};

export function Row({ theme, icon, leading, label, value, onPress, busy, destructive, last, right }: RowProps) {
  const color = destructive ? theme.danger : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || busy}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && onPress ? { backgroundColor: theme.chip } : null,
      ]}
    >
      {leading ?? (
        <View style={[styles.iconWrap, { backgroundColor: destructive ? theme.danger + '22' : theme.accentSoft }]}>
          <Ionicons name={icon ?? 'ellipse-outline'} size={17} color={destructive ? theme.danger : theme.text} />
        </View>
      )}
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
      {value !== undefined && (
        <Text style={[styles.value, { color: theme.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      )}
      {busy ? <ActivityIndicator color={theme.textMuted} /> : right}
      {onPress && !right && !busy && <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />}
    </Pressable>
  );
}

export function ToggleRow({ theme, icon, leading, label, value, onChange, last }: {
  theme: Theme;
  icon?: keyof typeof Ionicons.glyphMap;
  leading?: ReactNode;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <Row
      theme={theme}
      icon={icon}
      leading={leading}
      label={label}
      last={last}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: theme.accent, false: theme.chip }}
          thumbColor="#ffffff"
          accessibilityLabel={label}
        />
      }
    />
  );
}

export function Segmented<T extends string | number>({ theme, options, value, onChange }: {
  theme: Theme;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={[styles.segmented, { backgroundColor: theme.chip }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: theme.elevated, shadowOpacity: 0.08 }]}
          >
            <Text style={[styles.segmentText, { color: active ? theme.text : theme.textMuted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A labelled control row inside a Section (for Segmented and swatches). */
export function ControlRow({ theme, label, children, last }: { theme: Theme; label: string; children: ReactNode; last?: boolean }) {
  return (
    <View style={[styles.control, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <Text style={[styles.controlLabel, { color: theme.text }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 6 },
  group: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  footer: { fontSize: 12, paddingHorizontal: 6, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 52, paddingVertical: 8 },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 15, fontWeight: '600' },
  value: { fontSize: 14, maxWidth: '45%' },
  control: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  controlLabel: { fontSize: 15, fontWeight: '600' },
  segmented: { flexDirection: 'row', borderRadius: 11, padding: 3 },
  segment: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
});
