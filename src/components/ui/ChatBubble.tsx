// Message bubble. Dispatches content by kind (text, image, voice, document, location, poll),
// keeps both sides on neutral surfaces (coral is never a bubble fill), and shows forwarded,
// edited, starred, time, delivery, and reactions.

import { Forward, Flame, Heart, Laugh, type LucideIcon, Star, ThumbsUp } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DocumentMessage } from '@/components/message/DocumentMessage';
import { LocationMessage } from '@/components/message/LocationMessage';
import { MediaMessage } from '@/components/message/MediaMessage';
import { PollMessage } from '@/components/message/PollMessage';
import { VoiceMessage } from '@/components/message/VoiceMessage';
import { Icon } from '@/components/ui/Icon';
import { LocalMedia } from '@/components/ui/LocalMedia';
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
  author?: { name: string; color: string };
  onRetry?: () => void;
}

export function ChatBubble({ message, mine, replyPreview, author, onRetry }: ChatBubbleProps) {
  const theme = useTheme();
  const hasReactions = !!message.reactions && message.reactions.length > 0;

  let content: ReactNode;
  switch (message.kind) {
    case 'image':
      content = <MediaMessage message={message} />;
      break;
    case 'voice':
      content = <VoiceMessage message={message} mine={mine} />;
      break;
    case 'document':
      content = <DocumentMessage message={message} />;
      break;
    case 'location':
      content = <LocationMessage message={message} />;
      break;
    case 'poll':
      content = <PollMessage message={message} />;
      break;
    case 'sticker':
      content = <LocalMedia seed={message.stickerId ?? message.id} radius={theme.radius.md} style={{ width: 120, height: 120 }} />;
      break;
    case 'contact':
      content = (
        <View style={{ minWidth: 180, gap: 2 }}>
          <Text variant="bodyStrong">{message.contactName ?? 'Contact'}</Text>
          {message.contactUsername ? (
            <Text variant="footnote" tone="secondary">
              @{message.contactUsername}
            </Text>
          ) : null}
        </View>
      );
      break;
    default:
      content = message.text ? <Text variant="body">{message.text}</Text> : null;
  }

  return (
    <View style={{ maxWidth: '82%', alignSelf: mine ? 'flex-end' : 'flex-start', marginVertical: theme.space.xxs }}>
      <View
        style={{
          backgroundColor: mine ? theme.colors.elevated : theme.colors.surface,
          borderRadius: 18,
          borderBottomRightRadius: mine ? 6 : 18,
          borderBottomLeftRadius: mine ? 18 : 6,
          borderWidth: mine ? 0 : StyleSheet.hairlineWidth,
          borderColor: theme.colors.hairline,
          paddingHorizontal: theme.space.lg,
          paddingVertical: theme.space.sm,
          gap: theme.space.xxs,
        }}>
        {author ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xxs }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: author.color }} />
            <Text variant="caption" tone="secondary">
              {author.name}
            </Text>
          </View>
        ) : null}

        {message.forwardedFrom ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xxs }}>
            <Icon icon={Forward} size={12} tone="tertiary" />
            <Text variant="caption" tone="tertiary">
              Forwarded
            </Text>
          </View>
        ) : null}

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

        {content}

        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: theme.space.xs }}>
          {message.starred ? <Icon icon={Star} size={12} tone="accent" /> : null}
          {message.editedAt ? (
            <Text variant="caption" tone="tertiary">
              edited
            </Text>
          ) : null}
          <Text variant="caption" tone="secondary">
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

      {mine && message.status === 'failed' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Message not delivered. Tap to retry."
          onPress={onRetry}
          style={{ alignSelf: 'flex-end', marginTop: theme.space.xxs }}>
          <Text variant="caption" tone="danger">
            Not delivered. Tap to retry.
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
