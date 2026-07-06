// Chats list. The home surface. Pinned conversations lead when the list is unsearched, then
// everything else by recency. Search filters by title. Coral appears only as signal (unread
// badges inside each row, the QR action, the compose Fab), never as a wash.

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { PenSquare, QrCode } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { ChatListItem } from '@/components/ui/ChatListItem';
import { Fab } from '@/components/ui/Fab';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SearchField } from '@/components/ui/SearchField';
import { conversationTitle } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Conversation } from '@/types/models';

type Row =
  | { type: 'header'; label: string }
  | { type: 'conv'; conversation: Conversation };

function lastMessageMs(conversation: Conversation): number {
  return conversation.lastMessageAt ? new Date(conversation.lastMessageAt).getTime() : 0;
}

export default function ChatsScreen() {
  const theme = useTheme();
  const conversations = useChatStore((s) => s.conversations);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = conversations.filter((c) => conversationTitle(c).toLowerCase().includes(q));
  const sectioned = q.length === 0 && filtered.some((c) => c.pinned);

  const rows: Row[] = [];
  if (sectioned) {
    const pinned = filtered.filter((c) => c.pinned).sort((a, b) => lastMessageMs(b) - lastMessageMs(a));
    const rest = filtered.filter((c) => !c.pinned).sort((a, b) => lastMessageMs(b) - lastMessageMs(a));
    rows.push({ type: 'header', label: 'Pinned' });
    for (const c of pinned) rows.push({ type: 'conv', conversation: c });
    if (rest.length > 0) {
      rows.push({ type: 'header', label: 'All' });
      for (const c of rest) rows.push({ type: 'conv', conversation: c });
    }
  } else {
    const sorted = [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return lastMessageMs(b) - lastMessageMs(a);
    });
    for (const c of sorted) rows.push({ type: 'conv', conversation: c });
  }

  return (
    <Screen>
      <Header
        title="Chats"
        subtitle="Private by default"
        right={
          <IconButton accessibilityLabel="New chat via QR" onPress={() => router.push('/new')}>
            <Icon icon={QrCode} tone="secondary" />
          </IconButton>
        }
      />

      <View style={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space.sm }}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search chats" />
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="Start a chat and it lands here, end-to-end encrypted by default."
        />
      ) : (
        <View style={{ flex: 1 }}>
          <FlashList
            data={rows}
            keyExtractor={(item) => (item.type === 'header' ? 'h:' + item.label : 'c:' + item.conversation.id)}
            getItemType={(item) => item.type}
            renderItem={({ item }) => {
              if (item.type === 'header') return <ListSectionLabel label={item.label} />;
              return (
                <ChatListItem
                  conversation={item.conversation}
                  onPress={() =>
                    router.push({ pathname: '/conversation/[id]', params: { id: item.conversation.id } })
                  }
                />
              );
            }}
            contentContainerStyle={{ paddingBottom: theme.space['8xl'] }}
          />
        </View>
      )}

      <Fab icon={PenSquare} accessibilityLabel="New chat" onPress={() => router.push('/new')} />
    </Screen>
  );
}
