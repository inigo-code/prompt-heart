import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { KeyboardSafe } from '@/components/KeyboardSafe';
import { useTheme } from '@/lib/theme';

const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const OPEN_MS = 300;
const CLOSE_MS = 220;

type Props = {
  visible: boolean;
  /** Asked to close: a tap on the backdrop, the back button, or a drag down. */
  onClose: () => void;
  /** After the sheet has finished sliding away. */
  onClosed?: () => void;
  /** The sheet's own look (background, padding, corner radius). */
  style?: StyleProp<ViewStyle>;
  /** The handle: drag it down to close. */
  handle?: ReactNode;
  children: ReactNode;
};

/**
 * A bottom sheet: the backdrop fades while the sheet slides up, and both reverse on close. Drag the handle
 * down (or flick it) to close; a short drag springs back. With reduced motion it only fades.
 */
export function Sheet({ visible, onClose, onClosed, style, handle, children }: Props) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const height = useSharedValue(600);

  // Mount on open; on close, slide away first and only then take the Modal down.
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      drag.set(0);
      progress.set(withTiming(1, { duration: reduced ? 150 : OPEN_MS, easing: EASE_SHEET }));
      return;
    }
    const done = () => {
      setMounted(false);
      onClosed?.();
    };
    progress.set(
      withTiming(0, { duration: CLOSE_MS, easing: EASE_OUT }, (finished) => {
        if (finished) scheduleOnRN(done);
      }),
    );
    // onClosed is read when the close finishes; a new function each render doesn't restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted, reduced]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // Down follows the finger; up resists, so the sheet can't be pulled off its edge.
      drag.set(e.translationY > 0 ? e.translationY : e.translationY / 6);
    })
    .onEnd((e) => {
      const h = height.get();
      if (e.translationY > h * 0.3 || e.velocityY > 800) {
        drag.set(withTiming(h, { duration: CLOSE_MS, easing: EASE_OUT }));
        scheduleOnRN(onClose);
      } else {
        drag.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: e.velocityY }));
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const sheetStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: progress.get(), transform: [{ translateY: Math.max(drag.get(), 0) }] };
    return { transform: [{ translateY: Math.max((1 - progress.get()) * height.get(), drag.get()) }] };
  });

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.flex}>
        <KeyboardSafe>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }, backdropStyle]} />
          <Pressable style={styles.flex} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
          <Animated.View style={[style, sheetStyle]} onLayout={(e) => height.set(e.nativeEvent.layout.height)}>
            {handle ? (
              <GestureDetector gesture={pan}>
                <View style={styles.handleArea}>{handle}</View>
              </GestureDetector>
            ) : null}
            {children}
          </Animated.View>
        </KeyboardSafe>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  handleArea: { alignSelf: 'stretch', paddingTop: 2, paddingBottom: 6 },
});
