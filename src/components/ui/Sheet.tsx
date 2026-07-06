// Lightweight bottom sheet on RN Modal (no extra dependency). Backdrop dismiss, grabber,
// safe-area padding, spring-in. Used for attachments, message actions, and pickers.

import { type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ visible, onClose, children }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: theme.colors.scrim }}
      />
      <Animated.View
        entering={FadeInDown.duration(theme.motion.duration.slow)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.elevated,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          paddingTop: theme.space.sm,
          paddingBottom: insets.bottom + theme.space.md,
        }}>
        <View
          style={{
            alignSelf: 'center',
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.colors.hairline,
            marginBottom: theme.space.sm,
          }}
        />
        {children}
      </Animated.View>
    </Modal>
  );
}
