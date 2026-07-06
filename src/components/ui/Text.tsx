// Typed text primitive. Type scale + ink tone always come from tokens, never ad-hoc.
// Emphasis comes from variant (weight + size), not color; accent is reserved for signal.

import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { toneColor, type InkTone } from '@/theme/color';
import { useTheme } from '@/theme/ThemeProvider';
import { type TypeVariant } from '@/theme/typography';

export type { InkTone };

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: InkTone;
  center?: boolean;
}

export function Text({ variant = 'body', tone = 'ink', center = false, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[theme.type[variant], { color: toneColor(theme.colors, tone) }, center ? { textAlign: 'center' } : null, style]}
    />
  );
}
