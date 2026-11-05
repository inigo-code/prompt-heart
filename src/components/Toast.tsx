import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/AppText';
import { font, useTheme } from '@/lib/theme';

type ToastAction = { label: string; onPress: () => void };
type ShowToast = (message: string, action?: ToastAction) => void;

const ToastCtx = createContext<ShowToast>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [action, setAction] = useState<ToastAction | null>(null);
  const [visible, setVisible] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 200, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true }).start(() => setVisible(false));
  }, [opacity]);

  const show = useCallback<ShowToast>(
    (msg, act) => {
      setMessage(msg);
      setAction(act ?? null);
      setVisible(true);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.bezier(0.23, 1, 0.32, 1), useNativeDriver: true }).start();
      // Toasts with an action (Undo) stay up longer so there's time to tap it.
      timer.current = setTimeout(hide, act ? 4000 : 1400);
    },
    [opacity, hide],
  );

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents={action ? 'box-none' : 'none'}
          style={[
            styles.toast,
            // It rises a few points as it fades in, and sinks back as it goes.
            { bottom: insets.bottom + 96, backgroundColor: theme.toast, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
          ]}
        >
          <Text style={[styles.text, { color: theme.toastText }]}>{message}</Text>
          {action && (
            <Pressable
              hitSlop={10}
              accessibilityRole="button"
              onPress={() => {
                action.onPress();
                hide();
              }}
            >
              <Text style={[styles.action, { color: theme.toastText }]}>{action.label}</Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    maxWidth: '90%',
  },
  text: { fontSize: font.body, fontWeight: '600', flexShrink: 1 },
  action: { fontSize: font.body, fontWeight: '800' },
});
