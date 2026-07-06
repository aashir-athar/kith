// Compact back header for stacked routes (settings, onboarding, detail screens).

import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export interface BackHeaderProps {
  title?: string;
  right?: ReactNode;
  onBack?: () => void;
}

export function BackHeader({ title, right, onBack }: BackHeaderProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm,
        paddingHorizontal: theme.space.lg,
        paddingVertical: theme.space.sm,
        minHeight: 52,
      }}>
      <IconButton accessibilityLabel="Back" onPress={onBack ?? (() => router.back())}>
        <Icon icon={ArrowLeft} tone="ink" />
      </IconButton>
      {title ? (
        <Text variant="headline" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}
