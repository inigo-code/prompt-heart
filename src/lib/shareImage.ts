import * as Sharing from 'expo-sharing';
import type { ComponentRef, RefObject } from 'react';
import { Platform } from 'react-native';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { APP_NAME } from '@/lib/app';

/**
 * Draws a view into a PNG of the given size and opens the share sheet with it: Instagram (Story),
 * WhatsApp status, Drive, Photos or anything else. Needs no photo permission.
 */
export async function shareViewAsImage(ref: RefObject<ComponentRef<typeof View> | null>, width: number, height: number) {
  if (Platform.OS === 'web') throw new Error('Sharing the card works in the Android app.');
  if (!ref.current) throw new Error('The card isn’t ready yet.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this phone.');
  const uri = await captureRef(ref, { format: 'png', quality: 1, width, height, result: 'tmpfile' });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `Share your ${APP_NAME} card`, UTI: 'public.png' });
}
