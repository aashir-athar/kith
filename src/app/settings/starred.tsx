// Starred messages across all chats. Long-press a message and star it to collect it here.

import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Text } from '@/components/ui/Text';
import { clockTime } from '@/lib/format';
import { conversationTitle } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';

const KIND_LABEL: Record<string, string> = {
  image: 'Photo',
  voice: 'Voice message',
  document: 'Document',
  location: 'Location',
  contact: 'Contact',
  poll: 'Poll',
};

export default function StarredScreen() {
  const theme = useTheme();
  const messages = useChatStore((s) => s.messages);
  const conversations = useChatStore((s) => s.conversations);

  const titleFor = (cid: string) => {
    const conversation = conversations.find((c) => c.id === cid);
    return conversation ? conversationTitle(conversation) : 'Chat';
  };

  const starred = Object.entries(messages).flatMap(([cid, list]) =>
    list.filter((m) => m.starred).map((m) => ({ cid, message: m })),
  );

  return (
    <Screen edges={['top']}>
      <BackHeader title="Starred messages" />
      {starred.length === 0 ? (
        <EmptyState title="No starred messages" body="Long-press any message and star it to keep it here." />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: theme.space['6xl'] }}>
          {starred.map(({ cid, message }) => (
            <Pressable
              key={message.id}
              accessibilityRole="button"
              accessibilityLabel="Open message"
              onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: cid } })}
              style={({ pressed }) => ({
                paddingHorizontal: theme.space.xl,
                paddingVertical: theme.space.md,
                gap: 2,
                backgroundColor: pressed ? theme.colors.surface : 'transparent',
              })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" tone="accent">
                  {titleFor(cid)}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {clockTime(message.createdAt)}
                </Text>
              </View>
              <Text variant="body" numberOfLines={2}>
                {message.text ?? KIND_LABEL[message.kind] ?? 'Message'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
