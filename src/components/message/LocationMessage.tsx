// Location message content: a map placeholder with a pin and label. The real map view slots
// in behind the same shape.

import { MapPin } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import type { Message } from '@/types/models';

export function LocationMessage({ message }: { message: Message }) {
  const theme = useTheme();
  return (
    <View style={{ width: 224, gap: theme.space.xs }}>
      <View
        style={{
          height: 120,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
        <Icon icon={MapPin} size={28} tone="accent" />
      </View>
      <Text variant="subhead" numberOfLines={1}>
        {message.locationLabel ?? 'Shared location'}
      </Text>
    </View>
  );
}
