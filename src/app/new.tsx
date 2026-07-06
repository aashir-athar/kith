// New chat. Presented modally. A grouped actions card (new group, new community, scan a code)
// sits above a searchable people list. Tapping a person opens the existing direct thread when
// one exists, otherwise it creates one and drops into it.

import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { QrCode, UserPlus, Users, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SearchField } from '@/components/ui/SearchField';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { users } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { User } from '@/types/models';

export default function NewChatScreen() {
  const theme = useTheme();
  const createDirect = useChatStore((s) => s.createDirect);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const people = users.filter(
    (u) => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q),
  );

  const openWith = (user: User) => {
    const id = createDirect(user.id);
    router.replace({ pathname: '/conversation/[id]', params: { id } });
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
              <Surface variant="flat" style={{ marginHorizontal: theme.space.xl, overflow: 'hidden' }}>
                <SettingsRow icon={UserPlus} label="New group" onPress={() => router.push('/new-group')} />
                <SettingsRow icon={Users} label="New community" onPress={() => router.push('/new-community')} />
                <SettingsRow icon={QrCode} label="Scan a code" onPress={() => router.push('/scan')} />
              </Surface>
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
