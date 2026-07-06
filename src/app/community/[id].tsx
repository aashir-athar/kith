// A community's home: an editorial title that collapses into the bar on scroll, its channels,
// a members strip, invite and mute, an about section, and a quiet exit. Channels open the thread
// with a scale-appropriate privacy line, not a 1:1 safety-number claim.

import { router, useLocalSearchParams } from 'expo-router';
import { Bell, Hash, Megaphone, UserPlus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { EmptyState } from '@/components/feedback/EmptyState';
import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { users } from '@/lib/mockData';
import { useCommunityStore } from '@/stores/useCommunityStore';
import { useTheme } from '@/theme/ThemeProvider';

function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function CommunityScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = typeof id === 'string' ? id : '';
  const community = useCommunityStore((s) => s.communities.find((c) => c.id === cid));
  const scrollY = useSharedValue(0);
  const [muted, setMuted] = useState(false);

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
  const members = users.slice(0, 8);
  const divider = <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline, marginLeft: theme.space.xl }} />;

  return (
    <Screen edges={['top']}>
      <BackHeader title={community.name} scrollY={scrollY} />
      <ScrollView
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: theme.space['5xl'] }}
        showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: theme.space.xl, paddingTop: theme.space.sm, paddingBottom: theme.space.lg, gap: theme.space.sm }}>
          <Text variant="displayLg">{community.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
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
              accessibilityLabel={hasUnread ? `Open ${channel.name} channel, ${channel.unreadCount} unread` : `Open ${channel.name} channel`}
              onPress={() =>
                router.push(
                  isAnnouncement
                    ? '/channel/' + channel.id
                    : { pathname: '/conversation/[id]', params: { id: channel.id, channel: '1', members: String(community.memberCount) } },
                )
              }
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

        <ListSectionLabel label="Members" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.space.xl, gap: theme.space.md }}>
          {members.map((m) => (
            <View key={m.id} style={{ alignItems: 'center', width: 60, gap: theme.space.xxs }}>
              <Avatar name={m.displayName} seed={m.id} url={m.avatarUrl} size={48} />
              <Text variant="caption" tone="secondary" numberOfLines={1}>
                {m.displayName.split(' ')[0] ?? m.displayName}
              </Text>
            </View>
          ))}
        </ScrollView>

        <ListSectionLabel label="Community" />
        <Surface variant="flat" style={{ marginHorizontal: theme.space.xl, overflow: 'hidden' }}>
          <SettingsRow
            icon={UserPlus}
            label="Invite people"
            onPress={() => Alert.alert('Invite', 'Share an invite link. New members join encrypted; the server never sees the messages.')}
          />
          {divider}
          <SettingsRow
            icon={Bell}
            label="Mute community"
            onPress={() => setMuted((v) => !v)}
            right={<Toggle value={muted} onValueChange={setMuted} accessibilityLabel="Mute community" />}
          />
        </Surface>

        <ListSectionLabel label="About" />
        <View style={{ paddingHorizontal: theme.space.xl }}>
          <Text variant="body" tone="secondary">
            {community.description}
          </Text>
        </View>

        <View style={{ paddingHorizontal: theme.space.xl, marginTop: theme.space['2xl'] }}>
          <Button label="Leave community" variant="ghost" fullWidth onPress={() => router.back()} />
        </View>
      </ScrollView>
    </Screen>
  );
}
