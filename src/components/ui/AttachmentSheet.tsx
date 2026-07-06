// Attachment picker. A grid of send options. Selecting one closes the sheet and reports the
// chosen kind to the conversation, which performs the (mock) send.

import { Camera, Contact, FileText, Image as ImageIcon, MapPin, type LucideIcon, Vote } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export type AttachmentKind = 'photo' | 'camera' | 'document' | 'location' | 'contact' | 'poll';

const OPTIONS: { kind: AttachmentKind; label: string; icon: LucideIcon }[] = [
  { kind: 'photo', label: 'Photo', icon: ImageIcon },
  { kind: 'camera', label: 'Camera', icon: Camera },
  { kind: 'document', label: 'Document', icon: FileText },
  { kind: 'location', label: 'Location', icon: MapPin },
  { kind: 'contact', label: 'Contact', icon: Contact },
  { kind: 'poll', label: 'Poll', icon: Vote },
];

export interface AttachmentSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (kind: AttachmentKind) => void;
}

export function AttachmentSheet({ visible, onClose, onSelect }: AttachmentSheetProps) {
  const theme = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: theme.space.xl,
          paddingBottom: theme.space.sm,
        }}>
        {OPTIONS.map((option) => (
          <Pressable
            key={option.kind}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            onPress={() => {
              onSelect(option.kind);
              onClose();
            }}
            style={({ pressed }) => ({
              width: '33.33%',
              alignItems: 'center',
              gap: theme.space.xs,
              paddingVertical: theme.space.lg,
              opacity: pressed ? 0.6 : 1,
            })}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon icon={option.icon} size={24} tone="accent" />
            </View>
            <Text variant="footnote" tone="secondary">
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}
