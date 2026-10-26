import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { localImageUri } from '@/lib/images';

type Props = { imageId: string | null; onClose: () => void; onRemove?: (id: string) => void };

/** Full-screen view of one attachment, with an optional Remove button. */
export function ImageViewer({ imageId, onClose, onRemove }: Props) {
  const insets = useSafeAreaInsets();
  const uri = imageId ? localImageUri(imageId) : null;

  return (
    <Modal visible={imageId !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={styles.missing}>This image hasn&apos;t downloaded to this device yet.</Text>
        )}
        <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={styles.btn}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          {onRemove && imageId && (
            <Pressable
              onPress={() => {
                onRemove(imageId);
                onClose();
              }}
              hitSlop={10}
              accessibilityLabel="Remove image"
              style={styles.btn}
            >
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', justifyContent: 'center' },
  image: { width: '100%', height: '80%' },
  missing: { color: '#ccc', textAlign: 'center', paddingHorizontal: 32 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  btn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
});
