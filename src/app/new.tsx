// New chat. Presented modally. Two quick actions (scan a code, new community) sit above a
// searchable people list. Tapping a person opens the existing direct thread when one exists,
// otherwise it dismisses back to where the compose flow began.

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { QrCode, Users, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SearchField } from '@/components/ui/SearchField';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Text } from '@/components/ui/Text';
import { users } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { User } from '@/types/models';

export default function NewChatScreen() {
  const theme = useTheme();
  const conversations = useChatStore((s) => s.conversations);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const people = users.filter(
    (u) => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q),
  );

  const openWith = (user: User) => {
    const direct = conversations.find(
      (c) => c.kind === 'direct' && c.participantIds.includes(user.id),
    );
    const found = direct ?? conversations.find((c) => c.participantIds.includes(user.id));
    if (found) {
      router.replace({ pathname: '/conversation/[id]', params: { id: found.id } });
    } else {
      router.back();
    }
  };

  return (
    <Screen edges={['top']} padded>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: theme.space.sm,
          paddingBottom: theme.space.md,
        }}>
        <Text variant="title">New chat</Text>
        <IconButton accessibilityLabel="Close" onPress={() => router.back()}>
          <Icon icon={X} tone="secondary" />
        </IconButton>
      </View>

      <View style={{ paddingBottom: theme.space.sm }}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search people" autoFocus />
      </View>

      <View style={{ flex: 1, marginHorizontal: -theme.space.xl }}>
        <FlashList
          data={people}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View>
              <SettingsRow icon={QrCode} label="Scan a code" />
              <SettingsRow
                icon={Users}
                label="New community"
                onPress={() => router.push('/(tabs)/communities')}
              />
              <ListSectionLabel label="People" />
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.displayName}
              onPress={() => openWith(item)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space.md,
                paddingHorizontal: theme.space.xl,
                paddingVertical: theme.space.sm,
                backgroundColor: pressed ? theme.colors.surface : 'transparent',
              })}>
              <Avatar name={item.displayName} seed={item.id} url={item.avatarUrl} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.displayName}
                </Text>
                <Text variant="footnote" tone="secondary" numberOfLines={1}>
                  {'@' + item.username}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: theme.space.xl, paddingVertical: theme.space.lg }}>
              <Text variant="callout" tone="tertiary">
                No people match that search.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: theme.space['4xl'] }}
        />
      </View>
    </Screen>
  );
}
