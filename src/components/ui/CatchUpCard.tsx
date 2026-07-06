// On-device catch-up summary. Sits atop a busy thread. The "On device" chip is the point:
// the summary is generated locally, so private messages stay private. No sparkle slop.

import { Cpu, X } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export interface CatchUpCardProps {
  summary: string;
  onDismiss: () => void;
}

export function CatchUpCard({ summary, onDismiss }: CatchUpCardProps) {
  const theme = useTheme();
  return (
    <Surface variant="flat" elevation="e1" style={{ marginBottom: theme.space.md, padding: theme.space.lg, gap: theme.space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
          <Text variant="subhead" tone="accent">
            Catch me up
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              backgroundColor: theme.colors.overlay,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.space.sm,
              paddingVertical: 2,
            }}>
            <Icon icon={Cpu} size={11} tone="secondary" />
            <Text variant="caption" tone="secondary">
              On device
            </Text>
          </View>
        </View>
        <IconButton accessibilityLabel="Dismiss summary" size={28} onPress={onDismiss}>
          <Icon icon={X} size={16} tone="tertiary" />
        </IconButton>
      </View>
      <Text variant="body" tone="secondary">
        {summary}
      </Text>
    </Surface>
  );
}
