import { useState } from 'react';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

type Props = Omit<ComponentProps<typeof Pressable>, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far it presses in; bigger, rounder things can take a little more. */
  scale?: number;
};

/** A button that presses in under the finger the moment it's touched, and springs back on release. */
export function Tap({ style, scale = 0.97, disabled, onPressIn, onPressOut, ...rest }: Props) {
  const reduced = useReducedMotion();
  const [down, setDown] = useState(false);
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        setDown(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setDown(false);
        onPressOut?.(e);
      }}
      style={[
        style,
        reduced ? { opacity: down ? 0.75 : 1 } : { transform: [{ scale: down ? scale : 1 }] },
        { transitionProperty: reduced ? 'opacity' : 'transform', transitionDuration: 120, transitionTimingFunction: EASE_OUT },
      ]}
    />
  );
}
