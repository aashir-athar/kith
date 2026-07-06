// Channel: one-way broadcast. Admins post, everyone reads. Reached from a community.

import { useLocalSearchParams } from 'expo-router';
import { Bell, Hash, Megaphone } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Toggle } from '@/components/ui/Toggle';
import { Text } from '@/components/ui/Text';
import { communities } from '@/lib/mockData';
import { useTheme } from '@/theme/ThemeProvider';

const POSTS = [
  { id: 'cp1', text: 'Welcome. This channel is one-way: only admins post, everyone reads.', ago: '2h', reactions: 42 },
  { id: 'cp2', text: 'Reminder: verify a contact safety number before sharing anything sensitive.', ago: '1d', reactions: 88 },
  { id: 'cp3', text: 'New secure-tips guide is pinned in general.', ago: '3d', reactions: 17 },
];

export default function ChannelScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const channelId = typeof id === 'string' ? id : '';
  const community = communities.find((c) => c.channels.some((ch) => ch.id === channelId));
  const channel = community?.channels.find((ch) => ch.id === channelId);
  const [following, setFollowing] = useState(true);

  return (
    <Screen edges={['top']}>
      <BackHeader title={channel?.name ?? 'Channel'} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space['6xl'] }}>
        <View style={{ alignItems: 'center', gap: theme.space.sm, paddingHorizontal: theme.space.xl, paddingBottom: theme.space.lg }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon icon={channel?.kind === 'announcement' ? Megaphone : Hash} size={32} tone="accent" />
          </View>
          <Text variant="title">{channel?.name ?? 'Channel'}</Text>
          <Text variant="callout" tone="secondary">
            {community?.name ?? 'Broadcast channel'}
          </Text>
        </View>

        <View style={{ paddingHorizontal: theme.space.xl }}>
          <Surface variant="flat" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, padding: theme.space.lg }}>
            <Icon icon={Bell} tone="secondary" />
            <Text variant="body" style={{ flex: 1 }}>
              Notifications
            </Text>
            <Toggle value={following} onValueChange={setFollowing} accessibilityLabel="Channel notifications" />
          </Surface>
        </View>

        <View style={{ paddingHorizontal: theme.space.xl, paddingTop: theme.space.lg, gap: theme.space.md }}>
          {POSTS.map((post) => (
            <Surface key={post.id} variant="flat" style={{ padding: theme.space.lg, gap: theme.space.sm }}>
              <Text variant="body">{post.text}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" tone="tertiary">
                  {post.ago}
                </Text>
                <Text variant="caption" tone="secondary">
                  {post.reactions} reactions
                </Text>
              </View>
            </Surface>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
