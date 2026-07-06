// Message bubble. Outgoing and incoming are BOTH neutral surfaces (coral is never a bubble
// fill, it is a signal only); the sender side is distinguished by alignment, a flattened
// tail corner, and one elevation step. Read receipt is the single accent touch.

import { Flame, Heart, Laugh, type LucideIcon, ThumbsUp } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { MessageStatus } from '@/components/ui/MessageStatus';
import { Text } from '@/components/ui/Text';
import { clockTime } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import type { Message } from '@/types/models';

const REACTION_ICONS: Record<string, LucideIcon> = {
  thumbsup: ThumbsUp,
  heart: Heart,
  laugh: Laugh,
  fire: Flame,
};

export interface ChatBubbleProps {
  message: Message;
  mine: boolean;
  replyPreview?: { author: string; text: string };
}

export function ChatBubble({ message, mine, replyPreview }: ChatBubbleProps) {
  const theme = useTheme();
  const hasReactions = !!message.reactions && message.reactions.length > 0;

  return (
    <View style={{ maxWidth: '82%', alignSelf: mine ? 'flex-end' : 'flex-start', marginVertical: theme.space.xxs }}>
      <View
        style={{
          backgroundColor: mine ? theme.colors.elevated : theme.colors.surface,
          borderRadius: 18,
          borderBottomRightRadius: mine ? 6 : 18,
          borderBottomLeftRadius: mine ? 18 : 6,
          paddingHorizontal: theme.space.lg,
          paddingVertical: theme.space.sm,
          gap: theme.space.xxs,
        }}>
        {replyPreview ? (
          <View style={{ borderLeftWidth: 2, borderLeftColor: theme.colors.accent, paddingLeft: theme.space.sm, marginBottom: theme.space.xxs }}>
            <Text variant="caption" tone="accent">
              {replyPreview.author}
            </Text>
            <Text variant="footnote" tone="secondary" numberOfLines={1}>
              {replyPreview.text}
            </Text>
          </View>
        ) : null}

        {message.text ? <Text variant="body">{message.text}</Text> : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: theme.space.xs }}>
          {message.editedAt ? (
            <Text variant="caption" tone="tertiary">
              edited
            </Text>
          ) : null}
          <Text variant="caption" tone="tertiary">
            {clockTime(message.createdAt)}
          </Text>
          {mine ? <MessageStatus status={message.status} /> : null}
        </View>
      </View>

      {hasReactions ? (
        <View
          style={{
            flexDirection: 'row',
            gap: theme.space.xs,
            marginTop: theme.space.xxs,
            alignSelf: mine ? 'flex-end' : 'flex-start',
          }}>
          {message.reactions?.map((reaction) => (
            <View
              key={reaction.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                backgroundColor: theme.colors.elevated,
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.space.sm,
                paddingVertical: 3,
                borderWidth: 1,
                borderColor: theme.colors.hairline,
              }}>
              <Icon icon={REACTION_ICONS[reaction.key] ?? ThumbsUp} size={12} tone="secondary" />
              <Text variant="caption" tone="secondary">
                {reaction.userIds.length}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
