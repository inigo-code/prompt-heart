import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme';

export type SheetAction = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Replaces the icon, e.g. a category colour dot. */
  leading?: ReactNode;
  destructive?: boolean;
  onPress: () => void;
};

/** A compact row of buttons above the list, e.g. "Copy & open in" with one button per AI app. */
export type SheetQuickRow = {
  label: string;
  items: { key: string; label: string; leading: ReactNode; onPress: () => void }[];
};

type Props = {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  quick?: SheetQuickRow;
  onClose: () => void;
};

// Cross-platform replacement for multi-button Alert, which doesn't work on web.
export function ActionSheet({ visible, title, actions, quick, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const run = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 8 }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          {title && (
            <Text style={[styles.title, { color: theme.textMuted }]} numberOfLines={4}>
              {title}
            </Text>
          )}
          <ScrollView style={{ maxHeight: height * 0.7 }} bounces={false} showsVerticalScrollIndicator={false}>
            {quick && quick.items.length > 0 && (
              <View style={styles.quick}>
                <Text style={[styles.quickLabel, { color: theme.textMuted }]}>{quick.label}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                  {quick.items.map((q) => (
                    <Pressable
                      key={q.key}
                      onPress={() => run(q.onPress)}
                      accessibilityRole="button"
                      accessibilityLabel={`${quick.label} ${q.label}`}
                      style={({ pressed }) => [styles.quickItem, { backgroundColor: pressed ? theme.chip : theme.bg, borderColor: theme.border }]}
                    >
                      {q.leading}
                      <Text style={[styles.quickText, { color: theme.text }]} numberOfLines={1}>
                        {q.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            {actions.map((a) => {
              const color = a.destructive ? theme.danger : theme.text;
              return (
                <Pressable
                  key={a.label}
                  onPress={() => run(a.onPress)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.chip : 'transparent' }]}
                >
                  {a.leading ?? (
                    <View style={[styles.icon, { backgroundColor: a.destructive ? theme.danger + '1F' : theme.chip }]}>
                      <Ionicons name={a.icon ?? 'ellipse-outline'} size={17} color={color} />
                    </View>
                  )}
                  <Text style={[styles.rowText, { color }]} numberOfLines={2}>
                    {a.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancel, { backgroundColor: pressed ? theme.border : theme.chip }]}
          >
            <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 8, paddingHorizontal: 10 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 6 },
  title: { fontSize: 13, fontWeight: '600', lineHeight: 18, paddingHorizontal: 12, paddingTop: 4, paddingBottom: 6 },
  quick: { gap: 8, paddingTop: 4, paddingBottom: 8 },
  quickLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 12 },
  quickRow: { gap: 8, paddingHorizontal: 10 },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 38,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickText: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12 },
  icon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontSize: 15, fontWeight: '600' },
  cancel: { marginTop: 8, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700' },
});
