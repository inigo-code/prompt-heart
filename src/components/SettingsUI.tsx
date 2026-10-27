import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { font, shadow } from '@/lib/theme';
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
          trackColor={{ true: theme.accent, false: theme.dark ? '#3A3733' : '#CFC9BF' }}
          thumbColor="#ffffff"
          // React Native for Web colours the "on" knob with its own prop (it would otherwise be teal).
          {...(Platform.OS === 'web' ? ({ activeThumbColor: '#ffffff' } as object) : {})}
          ios_backgroundColor={theme.dark ? '#3A3733' : '#CFC9BF'}
          accessibilityLabel={label}
        />
      }
    />
  );
}

export function Segmented<T extends string | number>({ theme, options, value, onChange }: {
  theme: Theme;
  options: { value: T; label: string; icon?: keyof typeof Ionicons.glyphMap }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={[styles.segmented, { backgroundColor: theme.chip }]}>
      {options.map((o) => {
        const active = o.value === value;
        const color = active ? theme.accentText : theme.textMuted;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.segment,
              active ? { backgroundColor: theme.accent, boxShadow: shadow.subtle } : pressed ? { backgroundColor: theme.border } : null,
            ]}
          >
            {o.icon && <Ionicons name={o.icon} size={15} color={color} />}
            <Text style={[styles.segmentText, { color }, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A labelled control row inside a Section (for Segmented and swatches). */
export function ControlRow({ theme, label, value, children, last }: {
  theme: Theme;
  label: string;
  /** Current choice, shown next to the label (e.g. the accent colour's name). */
  value?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.control, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <View style={styles.controlHead}>
        <Text style={[styles.controlLabel, { color: theme.text }]}>{label}</Text>
        {value !== undefined && <Text style={[styles.controlValue, { color: theme.textMuted }]}>{value}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionTitle: { fontSize: font.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 6 },
  group: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  footer: { fontSize: font.caption, paddingHorizontal: 6, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52, paddingVertical: 8 },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: font.body, fontWeight: '600' },
  value: { fontSize: font.body, maxWidth: '45%' },
  control: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  controlHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  controlLabel: { fontSize: font.body, fontWeight: '600' },
  controlValue: { fontSize: font.body, fontWeight: '600' },
  segmented: { flexDirection: 'row', borderRadius: 11, padding: 3 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: font.body, fontWeight: '600' },
  segmentTextActive: { fontWeight: '800' },
});
