// Compact back header for stacked routes (settings, onboarding, detail screens).

import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Extrapolation, interpolate, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export interface BackHeaderProps {
  title?: string;
  right?: ReactNode;
  onBack?: () => void;
  // When provided, the title stays hidden until the large title below scrolls under the bar.
  scrollY?: SharedValue<number>;
}

export function BackHeader({ title, right, onBack, scrollY }: BackHeaderProps) {
  const theme = useTheme();
  const titleStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    return { opacity: interpolate(scrollY.value, [40, 80], [0, 1], Extrapolation.CLAMP) };
  });
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
        <Animated.View style={[{ flex: 1 }, titleStyle]}>
          <Text variant="headline" numberOfLines={1}>
            {title}
          </Text>
        </Animated.View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}
