import { forwardRef } from 'react';
import type { ComponentProps, ComponentRef } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';

import { useTheme } from '@/lib/theme';

/** Text still grows with the phone's font size, up to this much, so large settings don't break layouts. */
const MAX_FONT_SCALE = 1.3;
/** Selected text keeps its own colour, so the highlight has to stay see-through. */
const selection = (accent: string) => `${accent}66`;

function SelectableText(props: ComponentProps<typeof RNText>) {
  const theme = useTheme();
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} selectionColor={selection(theme.accent)} {...props} />;
}

export function Text(props: ComponentProps<typeof RNText>) {
  if (props.selectable) return <SelectableText {...props} />;
  return <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
}

export const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, ComponentProps<typeof RNTextInput>>(function TextInput(props, ref) {
  const theme = useTheme();
  return (
    <RNTextInput
      ref={ref}
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      selectionColor={selection(theme.accent)}
      selectionHandleColor={theme.accent}
      cursorColor={theme.accent}
      {...props}
    />
  );
});
