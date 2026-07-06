// Small uppercase section label for grouped lists and settings.

import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export function ListSectionLabel({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: theme.space.xl, paddingTop: theme.space.lg, paddingBottom: theme.space.sm }}>
      <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
    </View>
  );
}
