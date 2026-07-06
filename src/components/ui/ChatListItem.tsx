// Conversation row for the Chats list. Unread state raises the accent (count badge + time)
// and darkens the preview to ink; read rows stay quiet. Pin/mute/verified are small meta.

import { BadgeCheck, BellOff, Pin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { relativeTime } from '@/lib/format';
import { conversationPeer, conversationTitle } from '@/lib/mockData';
import { useTheme } from '@/theme/ThemeProvider';
import type { Conversation } from '@/types/models';

export interface ChatListItemProps {
  conversation: Conversation;
  onPress?: () => void;
}

export function ChatListItem({ conversation, onPress }: ChatListItemProps) {
  const theme = useTheme();
  const title = conversationTitle(conversation);
  const peer = conversationPeer(conversation);
  const unread = conversation.unreadCount > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.md,
        paddingHorizontal: theme.space.xl,
        paddingVertical: theme.space.sm,
        backgroundColor: pressed ? theme.colors.surface : 'transparent',
      })}>
      <Avatar name={title} seed={conversation.id} url={peer?.avatarUrl} size={52} />

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {peer?.verified ? <Icon icon={BadgeCheck} size={15} tone="accent" /> : null}
          {conversation.pinned ? <Icon icon={Pin} size={13} tone="tertiary" /> : null}
          {conversation.muted ? <Icon icon={BellOff} size={13} tone="tertiary" /> : null}
        </View>
        <Text variant="footnote" tone={unread ? 'ink' : 'secondary'} numberOfLines={1}>
          {conversation.lastMessagePreview ?? 'No messages yet'}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: theme.space.xs }}>
        <Text variant="caption" tone={unread ? 'accent' : 'tertiary'}>
          {conversation.lastMessageAt ? relativeTime(conversation.lastMessageAt) : ''}
        </Text>
        {unread ? (
          <View
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: theme.colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 6,
            }}>
            <Text variant="caption" tone="onAccent">
              {conversation.unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
