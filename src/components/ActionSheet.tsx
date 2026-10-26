import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme';

export type SheetAction = { label: string; destructive?: boolean; onPress: () => void };

type Props = {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
};

// Cross-platform replacement for multi-button Alert, which doesn't work on web.
export function ActionSheet({ visible, title, actions, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 12 }]}
          onStartShouldSetResponder={() => true}
        >
          {title && (
            <Text style={[styles.title, { color: theme.textMuted }]} numberOfLines={1}>
              {title}
            </Text>
          )}
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => {
                onClose();
                a.onPress();
              }}
              style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.chip : 'transparent' }]}
            >
              <Text style={[styles.rowText, { color: a.destructive ? theme.danger : theme.text }]}>{a.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={[styles.row, styles.cancel, { borderTopColor: theme.border }]}>
            <Text style={[styles.rowText, { color: theme.textMuted }]}>Cancel</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, paddingHorizontal: 8 },
  title: { fontSize: 13, fontWeight: '600', textAlign: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  row: { paddingVertical: 15, paddingHorizontal: 16, borderRadius: 12 },
  rowText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  cancel: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4, borderRadius: 0 },
});
