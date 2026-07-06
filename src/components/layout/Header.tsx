// Editorial screen header. The oversized display title is the personality; chrome stays quiet.
// Optional right slot for a single action. Pass a shared scroll value to collapse the large
// title into a compact bar on scroll (the long-promised behavior, now wired).

import { type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Extrapolation, interpolate, type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  scrollY?: SharedValue<number>;
}

export function Header({ title, subtitle, right, scrollY }: HeaderProps) {
  const theme = useTheme();

  const largeStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    const y = scrollY.value;
    return {
      opacity: interpolate(y, [0, 40], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(y, [0, 40], [0, -10], Extrapolation.CLAMP) }],
    };
  });

  const compactStyle = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 0 };
    return { opacity: interpolate(scrollY.value, [24, 48], [0, 1], Extrapolation.CLAMP) };
  });

  return (
    <View
      style={{
        paddingHorizontal: theme.space.xl,
        paddingTop: theme.space.lg,
        paddingBottom: theme.space.md,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: theme.space.md,
      }}>
      <View style={{ flex: 1 }}>
        <Animated.View style={largeStyle}>
          <Text variant="displayXl">{title}</Text>
          {subtitle ? (
            <Text variant="subhead" tone="secondary" style={{ marginTop: theme.space.xxs }}>
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>
        {scrollY ? (
          <Animated.View style={[{ position: 'absolute', left: 0, bottom: 0 }, compactStyle]} pointerEvents="none">
            <Text variant="headline">{title}</Text>
          </Animated.View>
        ) : null}
      </View>
      {right}
    </View>
  );
}
