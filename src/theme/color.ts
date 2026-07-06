// Ink tone resolver, shared by Text and Icon so tone always maps to the same token.

import type { SemanticColors } from './tokens';

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

export function toneColor(colors: SemanticColors, tone: InkTone): string {
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
