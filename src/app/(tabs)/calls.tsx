// Lever: safety cue. The call log leads with the encryption promise, and every entry is a
// one-tap redial. Coral stays out of the way here: with a call button on every row, accent
// would stop being a signal, so the actions read as quiet surface controls instead.

import { router } from 'expo-router';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from 'lucide-react-native';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { relativeTime } from '@/lib/format';
import { calls, usersById } from '@/lib/mockData';
import { useTheme } from '@/theme/ThemeProvider';
import type { CallRecord } from '@/types/models';

function directionIcon(direction: CallRecord['direction']) {
  if (direction === 'incoming') return PhoneIncoming;
  if (direction === 'outgoing') return PhoneOutgoing;
  return PhoneMissed;
}

function CallRow({ call }: { call: CallRecord }) {
  const theme = useTheme();
  const peer = usersById[call.peerId];
  const name = peer?.displayName ?? 'Unknown';
  const missed = call.direction === 'missed';
  const isVideo = call.kind === 'video';
  const kindLabel = isVideo ? 'Video' : 'Audio';
  const DirIcon = directionIcon(call.direction);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.md,
        paddingHorizontal: theme.space.xl,
        paddingVertical: theme.space.sm,
        minHeight: 64,
      }}>
      <Avatar name={name} seed={call.peerId} size={48} />

      <View style={{ flex: 1, gap: theme.space.xxs }}>
        <Text variant="bodyStrong" tone={missed ? 'danger' : 'ink'} numberOfLines={1}>
          {name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
          <Icon icon={DirIcon} size={14} tone={missed ? 'danger' : 'secondary'} />
          <Text variant="footnote" tone="secondary" numberOfLines={1}>
            {kindLabel} · {relativeTime(call.startedAt)}
          </Text>
        </View>
      </View>

      <IconButton
        accessibilityLabel={
          isVideo ? `Video call ${name}` : `Call ${name}`
        }
        variant="surface"
        onPress={() => router.push('/call/' + call.peerId)}>
        <Icon icon={isVideo ? Video : Phone} tone="ink" />
      </IconButton>
    </View>
  );
}

export default function CallsScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <Header
        title="Calls"
        subtitle="End-to-end encrypted"
        right={
          <IconButton accessibilityLabel="New call" onPress={() => router.push('/new')}>
            <Icon icon={Phone} tone="secondary" />
          </IconButton>
        }
      />
      {calls.length === 0 ? (
        <EmptyState
          title="No calls yet"
          body="Your calls are end-to-end encrypted. Start one from any chat."
        />
      ) : (
        <View style={{ flex: 1 }}>
          <FlashList
            data={calls}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CallRow call={item} />}
            contentContainerStyle={{
              paddingTop: theme.space.xs,
              paddingBottom: theme.space['5xl'],
            }}
          />
        </View>
      )}
    </Screen>
  );
}
