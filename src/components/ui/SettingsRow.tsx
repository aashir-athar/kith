// A single settings/list row. Optional leading icon, trailing value or custom right slot,
// chevron when it navigates. Danger tone for destructive rows.

import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export interface SettingsRowProps {
  label: string;
  icon?: LucideIcon;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: ReactNode;
}

export function SettingsRow({ label, icon, value, onPress, danger = false, right }: SettingsRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.md,
        minHeight: 52,
        paddingHorizontal: theme.space.xl,
        backgroundColor: pressed ? theme.colors.surface : 'transparent',
      })}>
      {icon ? <Icon icon={icon} size={20} tone={danger ? 'danger' : 'secondary'} /> : null}
      <Text variant="body" tone={danger ? 'danger' : 'ink'} style={{ flex: 1 }}>
        {label}
      </Text>
      {value ? (
        <Text variant="callout" tone="secondary">
          {value}
        </Text>
      ) : null}
      {right}
      {onPress && !right ? <Icon icon={ChevronRight} size={18} tone="tertiary" /> : null}
    </Pressable>
  );
}
