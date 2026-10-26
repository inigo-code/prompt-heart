import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/lib/theme';

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
    Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setVisible(false));
  }, [opacity]);

  const show = useCallback<ShowToast>(
    (msg, act) => {
      setMessage(msg);
      setAction(act ?? null);
      setVisible(true);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
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
          style={[styles.toast, { bottom: insets.bottom + 96, backgroundColor: theme.toast, opacity }]}
        >
          <Text style={[styles.text, { color: theme.toastText }]}>{message}</Text>
          {action && (
            <Pressable
              hitSlop={10}
              onPress={() => {
                action.onPress();
                hide();
              }}
            >
              <Text style={[styles.action, { color: theme.accent }]}>{action.label}</Text>
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
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
    maxWidth: '90%',
  },
  text: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  action: { fontSize: 14, fontWeight: '800' },
});
