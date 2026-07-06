// Lever: belonging + trust. Communities is the breadth play. Each card promises encrypted,
// moderated group messaging, the thing mainstream group chats never actually give you.

import { router } from 'expo-router';
import { Hash, Plus, Users } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { Fab } from '@/components/ui/Fab';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useCommunityStore } from '@/stores/useCommunityStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Community } from '@/types/models';

function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function CommunityCard({ community }: { community: Community }) {
  const theme = useTheme();
  const channelCount = community.channels.length;
  const memberLabel = `${formatCount(community.memberCount)} ${community.memberCount === 1 ? 'member' : 'members'}`;
  const channelLabel = `${channelCount} ${channelCount === 1 ? 'channel' : 'channels'}`;
  const unread = community.channels.reduce((n, c) => n + c.unreadCount, 0);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${community.name} community${unread > 0 ? `, ${unread} unread` : ''}`}
      onPress={() => router.push('/community/' + community.id)}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Surface
        variant="flat"
        elevation="e1"
        style={{ padding: theme.space.xl, gap: theme.space.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.hairline }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
          <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
            {community.name}
          </Text>
          {unread > 0 ? (
            <View
              style={{
                minWidth: 22,
                height: 22,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: theme.space.xs,
              }}>
              <Text variant="caption" tone="onAccent">
                {unread}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="callout" tone="secondary" numberOfLines={2}>
          {community.description}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.lg,
            marginTop: theme.space.xxs,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
            <Icon icon={Users} size={15} tone="secondary" />
            <Text variant="footnote" tone="secondary">
              {memberLabel}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
            <Icon icon={Hash} size={15} tone="secondary" />
            <Text variant="footnote" tone="secondary">
              {channelLabel}
            </Text>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

export default function CommunitiesScreen() {
  const theme = useTheme();
  const communities = useCommunityStore((s) => s.communities);

  if (communities.length === 0) {
    return (
      <Screen>
        <Header title="Communities" subtitle="Rooms for your people" />
        <EmptyState
          title="No communities yet"
          body="Join or start a community. Even in a group of thousands, what you say stays between members."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Communities" subtitle="Rooms for your people" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="How rooms stay encrypted and moderated"
        onPress={() => router.push('/security-explainer')}
        style={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space.sm }}>
        <Text variant="footnote" tone="secondary">
          How rooms stay encrypted and moderated
        </Text>
      </Pressable>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.space.xl,
          paddingTop: theme.space.sm,
          paddingBottom: theme.space['8xl'],
          gap: theme.space.md,
        }}
        showsVerticalScrollIndicator={false}>
        {communities.map((community) => (
          <CommunityCard key={community.id} community={community} />
        ))}
      </ScrollView>
      <Fab icon={Plus} accessibilityLabel="New community" onPress={() => router.push('/new-community')} />
    </Screen>
  );
}
