import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { localImageUri } from '@/lib/images';
import type { Theme } from '@/lib/theme';
import { useSync } from '@/sync/SyncProvider';

type Props = { id: string; theme: Theme; size?: number; style?: StyleProp<ViewStyle>; radius?: number };

/** Shows an attachment from the device, or a spinner while it downloads (an icon if it isn't available yet). */
export function ImageThumb({ id, theme, size = 56, style, radius = 10 }: Props) {
  // Re-render when the sync engine finishes downloading images.
  const { status } = useSync();
  const uri = localImageUri(id);
  const box = { width: size, height: size, borderRadius: radius };
  if (!uri) {
    return (
      <View style={[styles.placeholder, box, { backgroundColor: theme.chip }, style]}>
        {status === 'syncing' ? (
          <ActivityIndicator size="small" color={theme.textMuted} />
        ) : (
          <Ionicons name="image-outline" size={size * 0.4} color={theme.textMuted} />
        )}
      </View>
    );
  }
  return <Image source={{ uri }} style={[box, { backgroundColor: theme.chip }, style as object]} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
