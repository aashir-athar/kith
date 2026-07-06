// Editorial screen header. The oversized display title is the personality; chrome stays
// quiet. Optional right slot for a single action. Scroll-collapse behavior is layered on
// per-screen where it matters (long threads keep it calm).

import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function Header({ title, subtitle, right }: HeaderProps) {
  const theme = useTheme();
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
        <Text variant="displayXl">{title}</Text>
        {subtitle ? (
          <Text variant="subhead" tone="secondary" style={{ marginTop: theme.space.xxs }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
