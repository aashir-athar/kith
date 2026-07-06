// Search. Semantic search is the default in Kith; this is its entry. Grouped results across
// people, chats, and communities. Presented modally.

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { communities, conversationTitle, users } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function SearchScreen() {
  const theme = useTheme();
  const conversations = useChatStore((s) => s.conversations);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const people = q ? users.filter((u) => `${u.displayName} ${u.username}`.toLowerCase().includes(q)) : [];
  const chats = q ? conversations.filter((c) => conversationTitle(c).toLowerCase().includes(q)) : [];
  const comms = q ? communities.filter((c) => c.name.toLowerCase().includes(q)) : [];
  const empty = q.length > 0 && people.length === 0 && chats.length === 0 && comms.length === 0;

  const rowStyle = ({ pressed }: { pressed: boolean }) => ({
    paddingHorizontal: theme.space.xl,
    paddingVertical: theme.space.md,
    backgroundColor: pressed ? theme.colors.surface : 'transparent',
  });

  return (
    <Screen edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingHorizontal: theme.space.xl, paddingVertical: theme.space.sm }}>
        <View style={{ flex: 1 }}>
          <SearchField value={query} onChangeText={setQuery} autoFocus placeholder="Search Kith" />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => router.back()}>
          <Text variant="callout" tone="accent">
            Cancel
          </Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: theme.space['6xl'] }}>
        {q.length === 0 ? (
          <>
            <ListSectionLabel label="Try searching" />
            <View style={{ paddingHorizontal: theme.space.xl, gap: theme.space.sm }}>
              <Text variant="body" tone="secondary">People by name or username</Text>
              <Text variant="body" tone="secondary">Conversations and communities</Text>
              <Text variant="body" tone="secondary">Messages across your encrypted history</Text>
            </View>
          </>
        ) : null}

        {people.length > 0 ? <ListSectionLabel label="People" /> : null}
        {people.map((u) => (
          <Pressable key={u.id} accessibilityRole="button" accessibilityLabel={u.displayName} onPress={() => router.back()} style={rowStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md }}>
              <Avatar name={u.displayName} seed={u.id} url={u.avatarUrl} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>{u.displayName}</Text>
                <Text variant="footnote" tone="secondary">@{u.username}</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {chats.length > 0 ? <ListSectionLabel label="Chats" /> : null}
        {chats.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={conversationTitle(c)}
            onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: c.id } })}
            style={rowStyle}>
            <Text variant="bodyStrong" numberOfLines={1}>{conversationTitle(c)}</Text>
            {c.lastMessagePreview ? (
              <Text variant="footnote" tone="secondary" numberOfLines={1}>{c.lastMessagePreview}</Text>
            ) : null}
          </Pressable>
        ))}

        {comms.length > 0 ? <ListSectionLabel label="Communities" /> : null}
        {comms.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={c.name}
            onPress={() => router.push({ pathname: '/community/[id]', params: { id: c.id } })}
            style={rowStyle}>
            <Text variant="bodyStrong" numberOfLines={1}>{c.name}</Text>
            <Text variant="footnote" tone="secondary" numberOfLines={1}>{c.description}</Text>
          </Pressable>
        ))}

        {empty ? (
          <View style={{ paddingHorizontal: theme.space.xl, paddingTop: theme.space['4xl'] }}>
            <Text variant="body" tone="secondary" center>
              No results for {query.trim()}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
