// A community's home: the editorial header block, its channels (each a room you can open),
// and a quiet exit. Channels reuse the conversation thread, so opening one drops you
// straight into an encrypted chat.

import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Hash, Megaphone, Users } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { Text } from '@/components/ui/Text';
import { communities } from '@/lib/mockData';
import { useTheme } from '@/theme/ThemeProvider';

function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function BackHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.xs,
        paddingHorizontal: theme.space.md,
        paddingTop: theme.space.sm,
        paddingBottom: theme.space.sm,
      }}>
      <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
        <Icon icon={ArrowLeft} tone="ink" />
      </IconButton>
      <Text variant="headline" numberOfLines={1} style={{ flex: 1 }}>
        {title}
      </Text>
    </View>
  );
}

export default function CommunityScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = typeof id === 'string' ? id : '';
  const community = communities.find((c) => c.id === cid);

  if (!community) {
    return (
      <Screen edges={['top']}>
        <BackHeader title="Community" />
        <EmptyState
          title="Community not found"
          body="This community may have been removed, or the invite link is no longer valid."
        />
      </Screen>
    );
  }

  const memberLabel = `${formatCount(community.memberCount)} ${community.memberCount === 1 ? 'member' : 'members'}`;

  return (
    <Screen edges={['top']}>
      <BackHeader title={community.name} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.space['5xl'] }}
        showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingHorizontal: theme.space.xl,
            paddingTop: theme.space.sm,
            paddingBottom: theme.space.lg,
            gap: theme.space.sm,
          }}>
          <Text variant="displayLg">{community.name}</Text>
          <Text variant="body" tone="secondary">
            {community.description}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space.xs,
              marginTop: theme.space.xxs,
            }}>
            <Icon icon={Users} size={16} tone="secondary" />
            <Text variant="footnote" tone="secondary">
              {memberLabel}
            </Text>
          </View>
        </View>

        <ListSectionLabel label="Channels" />

        {community.channels.map((channel) => {
          const isAnnouncement = channel.kind === 'announcement';
          const hasUnread = channel.unreadCount > 0;
          return (
            <Pressable
              key={channel.id}
              accessibilityRole="button"
              accessibilityLabel={
                hasUnread
                  ? `Open ${channel.name} channel, ${channel.unreadCount} unread`
                  : `Open ${channel.name} channel`
              }
              onPress={() => router.push(isAnnouncement ? '/channel/' + channel.id : '/conversation/' + channel.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space.md,
                paddingHorizontal: theme.space.xl,
                paddingVertical: theme.space.md,
                minHeight: theme.minTouch,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Icon icon={isAnnouncement ? Megaphone : Hash} tone="secondary" />
              <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                {channel.name}
              </Text>
              {hasUnread ? (
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
                    {channel.unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        <View style={{ paddingHorizontal: theme.space.xl, marginTop: theme.space['2xl'] }}>
          <Button
            label="Leave community"
            variant="ghost"
            fullWidth
            onPress={() => router.back()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
