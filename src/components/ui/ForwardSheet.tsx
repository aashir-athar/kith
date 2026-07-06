// Forward target picker. Lists conversations; selecting one forwards the message there.

import { Pressable, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { conversationTitle } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';

export interface ForwardSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (conversationId: string) => void;
}

export function ForwardSheet({ visible, onClose, onSelect }: ForwardSheetProps) {
  const theme = useTheme();
  const conversations = useChatStore((s) => s.conversations);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <ListSectionLabel label="Forward to" />
      <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
        {conversations.map((conversation) => {
          const title = conversationTitle(conversation);
          return (
            <Pressable
              key={conversation.id}
              accessibilityRole="button"
              accessibilityLabel={title}
              onPress={() => {
                onSelect(conversation.id);
                onClose();
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space.md,
                paddingHorizontal: theme.space.xl,
                paddingVertical: theme.space.sm,
                backgroundColor: pressed ? theme.colors.surface : 'transparent',
              })}>
              <Avatar name={title} seed={conversation.id} size={40} />
              <Text variant="bodyStrong" numberOfLines={1}>
                {title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}
