// Blocked users. Lists everyone you have blocked and lets you unblock them. Blocking is enforced
// on the relay (a blocked user's messages are never forwarded or pushed to you), and mirrored here.

import { ScrollView, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { usersById } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function BlockedScreen() {
  const theme = useTheme();
  const blockedIds = useChatStore((s) => s.blockedUserIds);
  const unblockUser = useChatStore((s) => s.unblockUser);
  const blocked = blockedIds.map((id) => usersById[id]).filter((u): u is NonNullable<typeof u> => !!u);

  return (
    <Screen edges={['top']}>
      <BackHeader title="Blocked" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space['6xl'], gap: theme.space.lg }}>
        <Text variant="body" tone="secondary">
          Blocked people cannot reach you. Their messages are never delivered or pushed to your device.
        </Text>

        {blocked.length === 0 ? (
          <View style={{ paddingVertical: theme.space['4xl'], alignItems: 'center' }}>
            <Text variant="callout" tone="tertiary" center>
              You have not blocked anyone.
            </Text>
          </View>
        ) : (
          <Surface variant="flat" style={{ overflow: 'hidden' }}>
            {blocked.map((user, index) => (
              <View
                key={user.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.space.md,
                  padding: theme.space.lg,
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: theme.colors.hairline,
                }}>
                <Avatar name={user.displayName} seed={user.id} url={user.avatarUrl} size={40} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {user.displayName}
                  </Text>
                  <Text variant="footnote" tone="secondary">
                    @{user.username}
                  </Text>
                </View>
                <Button label="Unblock" variant="secondary" size="sm" onPress={() => unblockUser(user.id)} />
              </View>
            ))}
          </Surface>
        )}
      </ScrollView>
    </Screen>
  );
}
