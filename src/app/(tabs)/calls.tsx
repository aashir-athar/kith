// Call log. Grouped by day, filterable to Missed, and every row is tappable to the thread with
// a one-tap redial on the right. Call type is shown once, by the redial control; the row body
// carries direction and time. Coral stays out of the way here.

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { dayLabel, relativeTime } from '@/lib/format';
import { calls, usersById } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { CallRecord } from '@/types/models';

function directionIcon(direction: CallRecord['direction']) {
  if (direction === 'incoming') return PhoneIncoming;
  if (direction === 'outgoing') return PhoneOutgoing;
  return PhoneMissed;
}

function CallRow({ call }: { call: CallRecord }) {
  const theme = useTheme();
  const createDirect = useChatStore((s) => s.createDirect);
  const peer = usersById[call.peerId];
  const name = peer?.displayName ?? 'Unknown';
  const missed = call.direction === 'missed';
  const isVideo = call.kind === 'video';
  const DirIcon = directionIcon(call.direction);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Call history with ${name}`}
      onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: createDirect(call.peerId) } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.md,
        paddingHorizontal: theme.space.xl,
        paddingVertical: theme.space.sm,
        minHeight: 64,
        backgroundColor: pressed ? theme.colors.surface : 'transparent',
      })}>
      <Avatar name={name} seed={call.peerId} size={48} />

      <View style={{ flex: 1, gap: theme.space.xxs }}>
        <Text variant="bodyStrong" tone={missed ? 'danger' : 'ink'} numberOfLines={1}>
          {name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
          <Icon icon={DirIcon} size={14} tone={missed ? 'danger' : 'secondary'} />
          <Text variant="footnote" tone={missed ? 'danger' : 'secondary'} numberOfLines={1}>
            {missed ? 'Missed · ' : ''}
            {relativeTime(call.startedAt)}
          </Text>
        </View>
      </View>

      <IconButton
        accessibilityLabel={isVideo ? `Video call ${name}` : `Call ${name}`}
        variant="surface"
        onPress={() => router.push({ pathname: '/call/[id]', params: { id: call.peerId, kind: call.kind } })}>
        <Icon icon={isVideo ? Video : Phone} tone="ink" />
      </IconButton>
    </Pressable>
  );
}

type CallListRow = { type: 'day'; label: string } | { type: 'call'; call: CallRecord };

type CallFilter = 'all' | 'missed';

const FILTERS: readonly { label: string; value: CallFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Missed', value: 'missed' },
];

export default function CallsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<CallFilter>('all');

  const visible = filter === 'missed' ? calls.filter((c) => c.direction === 'missed') : calls;

  const rows: CallListRow[] = [];
  let lastDay = '';
  for (const call of visible) {
    const day = dayLabel(call.startedAt);
    if (day !== lastDay) {
      rows.push({ type: 'day', label: day });
      lastDay = day;
    }
    rows.push({ type: 'call', call });
  }

  return (
    <Screen>
      <Header
        title="Calls"
        right={
          <IconButton accessibilityLabel="New call" onPress={() => router.push('/new')}>
            <Icon icon={Phone} tone="secondary" />
          </IconButton>
        }
      />
      <View style={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space.sm }}>
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      {rows.length === 0 ? (
        <EmptyState
          title={filter === 'missed' ? 'No missed calls' : 'No calls yet'}
          body={
            filter === 'missed'
              ? 'Missed calls collect here so you can catch up in one place.'
              : 'Call anyone from a chat. Voice and video, encrypted the whole way through.'
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          <FlashList
            data={rows}
            keyExtractor={(item) => (item.type === 'day' ? 'd:' + item.label : 'c:' + item.call.id)}
            getItemType={(item) => item.type}
            renderItem={({ item }) => (item.type === 'day' ? <ListSectionLabel label={item.label} /> : <CallRow call={item.call} />)}
            contentContainerStyle={{ paddingTop: theme.space.xs, paddingBottom: theme.space['5xl'] }}
          />
        </View>
      )}
    </Screen>
  );
}
