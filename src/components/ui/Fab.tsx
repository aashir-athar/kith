// Floating action button. The one coral affordance that floats above a list (compose a new
// chat, start a call). Self-positions bottom-right; override via style.

import { type LucideIcon } from 'lucide-react-native';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface FabProps {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Fab({ icon, accessibilityLabel, onPress, style }: FabProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.92, { duration: theme.motion.duration.instant });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: theme.motion.duration.fast });
      }}
      style={[
        animatedStyle,
        {
          position: 'absolute',
          right: theme.space.xl,
          bottom: theme.space.xl,
          width: 56,
          height: 56,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        theme.elevation.e2,
        style,
      ]}>
      <Icon icon={icon} size={26} tone="onAccent" strokeWidth={2.4} />
    </AnimatedPressable>
  );
}
