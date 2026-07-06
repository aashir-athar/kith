// Presence indicator. Ringed dot so it reads on any surface. Offline renders nothing.

import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Presence } from '@/types/models';

export interface PresenceDotProps {
  presence: Presence;
  size?: number;
}

export function PresenceDot({ presence, size = 12 }: PresenceDotProps) {
  const theme = useTheme();
  if (presence === 'offline') return null;
  const color = presence === 'online' ? theme.colors.success : theme.colors.inkSecondary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: theme.colors.base,
      }}
    />
  );
}
