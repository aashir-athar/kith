// Document message content: file glyph, name, size.

import { FileText } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import type { Message } from '@/types/models';

export function DocumentMessage({ message }: { message: Message }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, minWidth: 200 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon icon={FileText} size={20} tone="secondary" />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="subhead" numberOfLines={1}>
          {message.fileName ?? 'Document'}
        </Text>
        <Text variant="caption" tone="tertiary">
          {message.fileSize ?? ''}
        </Text>
      </View>
    </View>
  );
}
