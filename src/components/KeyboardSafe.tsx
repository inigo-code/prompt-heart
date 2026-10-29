import { useEffect, useRef, useState } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

type Props = {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** Called after the keyboard opens and the content has made room for it. */
  onKeyboardShown?: () => void;
};

/**
 * Keeps a screen's content above the keyboard. The app draws edge to edge, so Android no longer
 * shrinks the window when the keyboard opens; this pads the bottom by exactly as much as the
 * keyboard covers, and by nothing where the system already made room.
 */
export function KeyboardSafe({ style, children, onKeyboardShown }: Props) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [pad, setPad] = useState(0);
  const shown = useRef(onKeyboardShown);
  useEffect(() => {
    shown.current = onKeyboardShown;
  });

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const open = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      const keyboardTop = e.endCoordinates.screenY;
      ref.current?.measureInWindow((_x, y, _w, height) => {
        setPad(Math.max(0, Math.round(y + height - keyboardTop)));
        // Let the padding lay out before anything scrolls to the caret.
        setTimeout(() => shown.current?.(), 60);
      });
    });
    const close = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setPad(0));
    return () => {
      open.remove();
      close.remove();
    };
  }, []);

  return (
    <View ref={ref} style={[{ flex: 1 }, style, { paddingBottom: pad }]}>
      {children}
    </View>
  );
}
