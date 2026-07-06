// Screen wrapper: safe-area aware, base-colored floor. Every route renders inside one so
// notch / dynamic island / home indicator and Android gesture insets are always handled.

import { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

export interface ScreenProps {
  children: ReactNode;
  edges?: readonly Edge[];
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Screen({ children, edges = ['top'], padded = false, style }: ScreenProps) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[
        { flex: 1, backgroundColor: theme.colors.base },
        padded ? { paddingHorizontal: theme.space.xl } : null,
        style,
      ]}>
      {children}
    </SafeAreaView>
  );
}
