// Search. Semantic search is the default in Kith; this is its entry. Grouped results across
// people, chats, and communities. Presented modally.

import { router } from 'expo-router';
import { Clock, Search } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { conversationTitle, users } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useCommunityStore } from '@/stores/useCommunityStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function SearchScreen() {
  const theme = useTheme();
  const conversations = useChatStore((s) => s.conversations);
  const communities = useCommunityStore((s) => s.communities);
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>(['Frontline Press']);
  const q = query.trim().toLowerCase();

  const run = (s: string) => {
    setQuery(s);
    setRecents((r) => [s, ...r.filter((x) => x !== s)].slice(0, 5));
  };

  const suggestions = [communities[0]?.name, users[0]?.displayName, users[1]?.displayName].filter(
    (s): s is string => !!s,
  );

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          hitSlop={theme.hitSlop}
          onPress={() => router.back()}
          style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text variant="callout" tone="accent">
            Cancel
          </Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: theme.space['6xl'] }}>
        {q.length === 0 ? (
          <>
            {recents.length > 0 ? (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: theme.space.xl,
                    paddingTop: theme.space.lg,
                    paddingBottom: theme.space.xs,
                  }}>
                  <Text variant="caption" tone="tertiary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Recent
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear recent searches" hitSlop={theme.hitSlop} onPress={() => setRecents([])}>
                    <Text variant="caption" tone="secondary">
                      Clear
                    </Text>
                  </Pressable>
                </View>
                {recents.map((s) => (
                  <Pressable key={'r:' + s} accessibilityRole="button" accessibilityLabel={`Search ${s}`} onPress={() => run(s)} style={rowStyle}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md }}>
                      <Icon icon={Clock} size={18} tone="tertiary" />
                      <Text variant="body">{s}</Text>
                    </View>
                  </Pressable>
                ))}
              </>
            ) : null}

            <ListSectionLabel label="Try searching" />
            {suggestions.map((s) => (
              <Pressable key={s} accessibilityRole="button" accessibilityLabel={`Search ${s}`} onPress={() => run(s)} style={rowStyle}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md }}>
                  <Icon icon={Search} size={18} tone="tertiary" />
                  <Text variant="body">{s}</Text>
                </View>
              </Pressable>
            ))}

            <View style={{ paddingHorizontal: theme.space.xl, paddingTop: theme.space.lg }}>
              <Text variant="footnote" tone="tertiary">
                Semantic search looks across people, chats, communities, and the message text you can decrypt on this device.
              </Text>
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
