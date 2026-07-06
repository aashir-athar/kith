// Standardized icon wrapper over lucide-react-native. Fixes stroke weight and maps color to
// an ink tone so icons stay consistent with type. Pass the lucide component as `icon`.

import { type LucideIcon } from 'lucide-react-native';

import { toneColor, type InkTone } from '@/theme/color';
import { useTheme } from '@/theme/ThemeProvider';

export interface IconProps {
  icon: LucideIcon;
  size?: number;
  tone?: InkTone;
  strokeWidth?: number;
}

export function Icon({ icon: LucideComponent, size = 22, tone = 'ink', strokeWidth = 2 }: IconProps) {
  const theme = useTheme();
  return <LucideComponent size={size} color={toneColor(theme.colors, tone)} strokeWidth={strokeWidth} />;
}
