// Typed text primitive. Every string in the app renders through this so type scale and ink
// tone always come from tokens, never ad-hoc. Emphasis comes from variant (weight + size),
// not color; the accent tone is reserved for genuine signal.

import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { type SemanticColors } from '@/theme/tokens';
import { type TypeVariant } from '@/theme/typography';

export type InkTone =
  | 'ink'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'onAccent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: InkTone;
  center?: boolean;
}

function toneColor(colors: SemanticColors, tone: InkTone): string {
  switch (tone) {
    case 'ink':
      return colors.ink;
    case 'secondary':
      return colors.inkSecondary;
    case 'tertiary':
      return colors.inkTertiary;
    case 'accent':
      return colors.accentText;
    case 'onAccent':
      return colors.onAccent;
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    case 'info':
      return colors.info;
  }
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
