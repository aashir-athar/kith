// Conversation thread. Custom chat header (back, identity, call actions) sits above the
// message list so it stays put while the keyboard raises the composer. Both bubble sides are
// neutral surfaces; coral is reserved for the send affordance inside the composer.

import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, Video } from 'lucide-react-native';
import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { Composer } from '@/components/ui/Composer';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { conversationPeer, conversationTitle, me } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function ConversationScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = typeof id === 'string' ? id : '';

  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === cid));
  const stored = useChatStore((s) => s.messages[cid]);
  const sendText = useChatStore((s) => s.sendText);
  const markRead = useChatStore((s) => s.markRead);

  const messages = stored ?? [];
  const title = conversation ? conversationTitle(conversation) : 'Conversation';
  const callTargetId = conversation ? (conversationPeer(conversation)?.id ?? cid) : cid;

  useEffect(() => {
    if (cid) markRead(cid);
  }, [cid, markRead]);

  return (
    <Screen edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
          paddingHorizontal: theme.space.lg,
          paddingTop: theme.space.sm,
          paddingBottom: theme.space.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.hairline,
        }}>
        <IconButton accessibilityLabel="Back" onPress={() => router.back()}>
          <Icon icon={ArrowLeft} tone="ink" />
        </IconButton>

        <Avatar size={36} name={title} seed={cid} />

        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" tone="secondary">
            end-to-end encrypted
          </Text>
        </View>

        <IconButton
          accessibilityLabel="Start video call"
          onPress={() => router.push({ pathname: '/call/[id]', params: { id: callTargetId } })}>
          <Icon icon={Video} tone="secondary" />
        </IconButton>
        <IconButton
          accessibilityLabel="Start voice call"
          onPress={() => router.push({ pathname: '/call/[id]', params: { id: callTargetId } })}>
          <Icon icon={Phone} tone="secondary" />
        </IconButton>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: theme.space['4xl'],
              }}>
              <Text variant="callout" tone="tertiary" center>
                No messages yet. Say hello.
              </Text>
            </View>
          ) : (
            <FlashList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ChatBubble message={item} mine={item.senderId === me.id} />}
              contentContainerStyle={{ paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md }}
              maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
            />
          )}
        </View>

        <Composer
          onSend={(t) => {
            if (cid) sendText(cid, t);
          }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
