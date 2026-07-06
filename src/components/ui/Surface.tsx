// The one place the glass/blur/flat decision lives, so screens stay clean.
// iOS 26+  -> native Apple Liquid Glass (expo-glass-effect GlassView)
// iOS < 26 -> expo-blur BlurView + a legibility scrim (+ optional brand tint)
// Android  -> flat themed surface with elevation (never blur, never glass)
// Glass is for CHROME only (nav, header, tab bar, sheets, controls). Content stays flat.

import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

export type SurfaceVariant = 'flat' | 'glass';
export type SurfaceElevation = 'e0' | 'e1' | 'e2' | 'e3';

export interface SurfaceProps {
  variant?: SurfaceVariant;
  tint?: 'neutral' | 'brand';
  interactive?: boolean;
  elevation?: SurfaceElevation;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const BRAND_GLASS_TINT = 'rgba(255,90,44,0.10)';
const BRAND_BLUR_TINT = 'rgba(255,90,44,0.08)';

export function Surface({
  variant = 'flat',
  tint = 'neutral',
  interactive = false,
  elevation = 'e0',
  radius,
  style,
  children,
}: SurfaceProps) {
  const theme = useTheme();
  const r = radius ?? theme.radius.lg;
  const brand = tint === 'brand';

  if (variant === 'glass') {
    if (glassAvailable) {
      return (
        <GlassView
          glassEffectStyle="regular"
          isInteractive={interactive}
          tintColor={brand ? BRAND_GLASS_TINT : undefined}
          style={[{ borderRadius: r, overflow: 'hidden' }, style]}>
          {children}
        </GlassView>
      );
    }
    if (Platform.OS === 'ios') {
      return (
        <View style={[{ borderRadius: r, overflow: 'hidden' }, style]}>
          <BlurView
            intensity={40}
            tint={theme.scheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]} />
          {brand ? <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND_BLUR_TINT }]} /> : null}
          {children}
        </View>
      );
    }
    return (
      <View
        style={[
          {
            backgroundColor: theme.colors.elevated,
            borderRadius: r,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.hairline,
          },
          theme.elevation[elevation],
          style,
        ]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[{ backgroundColor: theme.colors.surface, borderRadius: r }, theme.elevation[elevation], style]}>
      {children}
    </View>
  );
}
