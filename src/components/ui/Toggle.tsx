// Switch wrapper with correct colors in BOTH themes. The stock Switch thumb bound to ink goes
// near-black in light mode and reads as broken; here the thumb stays light and the off-track
// stays visibly filled.

import { Switch } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
}

export function Toggle({ value, onValueChange, accessibilityLabel }: ToggleProps) {
  const theme = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: theme.colors.accent, false: theme.colors.inkTertiary }}
      thumbColor="#FAFAFA"
      ios_backgroundColor={theme.colors.inkTertiary}
    />
  );
}
