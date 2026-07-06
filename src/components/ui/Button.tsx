// Primary interaction primitive. Coral fill is reserved for the single primary action per
// screen (variant "primary"); everything else is quiet. Press gives a subtle scale + light
// haptic (peak-end craft). Never a spinner: a busy button dims and disables.

import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { type InkTone, Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 56 };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  disabled = false,
  busy = false,
  fullWidth = false,
  haptic = true,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const inactive = disabled || busy;

  const bg =
    variant === 'primary'
      ? theme.colors.accent
      : variant === 'secondary'
        ? theme.colors.elevated
        : 'transparent';
  const border =
    variant === 'secondary'
      ? theme.colors.hairline
      : variant === 'danger'
        ? theme.colors.danger
        : 'transparent';
  const labelTone: InkTone =
    variant === 'primary' ? 'onAccent' : variant === 'danger' ? 'danger' : 'ink';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={() => {
        if (inactive) return;
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      onPressIn={() => {
        scale.value = withTiming(0.98, { duration: theme.motion.duration.instant });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: theme.motion.duration.fast });
      }}
      style={[
        animatedStyle,
        {
          height: HEIGHT[size],
          paddingHorizontal: theme.space['2xl'],
          borderRadius: theme.radius.md,
          backgroundColor: bg,
          borderWidth: variant === 'secondary' || variant === 'danger' ? 1 : 0,
          borderColor: border,
          opacity: inactive ? 0.55 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
        {leftIcon}
        <Text variant={size === 'sm' ? 'subhead' : 'bodyStrong'} tone={labelTone}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}
