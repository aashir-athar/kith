// Archived chats. Tucked away but still encrypted. Reached from the top of the Chats list.

import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { ChatListItem } from '@/components/ui/ChatListItem';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function ArchivedScreen() {
  const theme = useTheme();
  const conversations = useChatStore((s) => s.conversations);
  const archived = conversations.filter((c) => c.archived);

  return (
    <Screen edges={['top']}>
      <BackHeader title="Archived" />
      {archived.length === 0 ? (
        <EmptyState title="Nothing archived" body="Chats you archive are tucked away here, still end-to-end encrypted." />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: theme.space['6xl'] }}>
          {archived.map((conversation) => (
            <ChatListItem
              key={conversation.id}
              conversation={conversation}
              onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: conversation.id } })}
            />
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
