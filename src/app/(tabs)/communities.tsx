// Lever: belonging + trust. Communities is the breadth play. Each card promises encrypted,
// moderated group messaging, the thing mainstream group chats never actually give you.

import { router } from 'expo-router';
import { Hash, Plus, Users } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { Fab } from '@/components/ui/Fab';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { communities } from '@/lib/mockData';
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${community.name} community`}
      onPress={() => router.push('/community/' + community.id)}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Surface variant="flat" elevation="e1" style={{ padding: theme.space.xl, gap: theme.space.sm }}>
        <Text variant="title" numberOfLines={1}>
          {community.name}
        </Text>
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

  if (communities.length === 0) {
    return (
      <Screen>
        <Header title="Communities" subtitle="Encrypted, moderated, yours" />
        <EmptyState
          title="No communities yet"
          body="Join or start a community. Even in a group of thousands, what you say stays between members."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="Communities" subtitle="Encrypted, moderated, yours" />
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
      <Fab icon={Plus} accessibilityLabel="New community" />
    </Screen>
  );
}
