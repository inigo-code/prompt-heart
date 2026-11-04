import { forwardRef } from 'react';
import type { ComponentProps, ComponentRef } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';

/** Text still grows with the phone's font size, up to this much, so large settings don't break layouts. */
const MAX_FONT_SCALE = 1.3;

export function Text(props: ComponentProps<typeof RNText>) {
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
}

export const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, ComponentProps<typeof RNTextInput>>(function TextInput(props, ref) {
  return <RNTextInput ref={ref} maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
});
