// Status rings across the top of Chats. Your status first (with an add badge), then contacts.
// Unseen rings glow coral; seen rings go quiet. Encrypted and ad-free by design.

import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { me, usersById } from '@/lib/mockData';
import { useSessionStore } from '@/stores/useSessionStore';
import { useStatusStore } from '@/stores/useStatusStore';
import { useTheme } from '@/theme/ThemeProvider';

function Ring({ active, children }: { active: boolean; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ padding: 2, borderRadius: 32, borderWidth: 2, borderColor: active ? theme.colors.accent : theme.colors.hairline }}>
      {children}
    </View>
  );
}

export function StoryStrip() {
  const theme = useTheme();
  const feeds = useStatusStore((s) => s.feeds);
  const myStories = useStatusStore((s) => s.myStories);
  const user = useSessionStore((s) => s.currentUser);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: theme.space.xl, gap: theme.space.md, paddingVertical: theme.space.sm }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Your status"
        onPress={() =>
          myStories.length > 0
            ? router.push({ pathname: '/status/[id]', params: { id: me.id } })
            : router.push('/status/compose')
        }
        style={{ alignItems: 'center', gap: theme.space.xxs, width: 66 }}>
        <View>
          <Ring active={false}>
            <Avatar name={user.displayName} seed={user.id} url={user.avatarUrl} size={56} />
          </Ring>
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: theme.colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: theme.colors.base,
            }}>
            <Icon icon={Plus} size={12} tone="onAccent" strokeWidth={3} />
          </View>
        </View>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          You
        </Text>
      </Pressable>

      {feeds.map((feed) => {
        const author = usersById[feed.authorId];
        if (!author) return null;
        const firstName = author.displayName.split(' ')[0] ?? author.displayName;
        return (
          <Pressable
            key={feed.authorId}
            accessibilityRole="button"
            accessibilityLabel={`${author.displayName} status`}
            onPress={() => router.push({ pathname: '/status/[id]', params: { id: feed.authorId } })}
            style={{ alignItems: 'center', gap: theme.space.xxs, width: 66 }}>
            <Ring active={feed.hasUnseen}>
              <Avatar name={author.displayName} seed={author.id} url={author.avatarUrl} size={56} />
            </Ring>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {firstName}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
