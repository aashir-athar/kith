// Icon-agnostic tappable target. Meets the 44pt minimum with hitSlop, gives press feedback,
// and stays theme-driven. Pass the icon element as children (keeps this decoupled from any
// specific icon set).

import { type ReactNode } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface IconButtonProps {
  onPress?: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  size?: number;
  variant?: 'plain' | 'surface';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  onPress,
  accessibilityLabel,
  children,
  size = 44,
  variant = 'plain',
  disabled = false,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={theme.hitSlop}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.9, { duration: theme.motion.duration.instant });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: theme.motion.duration.fast });
      }}
      style={[
        animatedStyle,
        {
          width: size,
          height: size,
          borderRadius: theme.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'surface' ? theme.colors.elevated : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}>
      {children}
    </AnimatedPressable>
  );
}
