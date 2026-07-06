// New group: name + member selection, then create. Presented modally.

import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { users } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/typography';

export default function NewGroupScreen() {
  const theme = useTheme();
  const createGroup = useChatStore((s) => s.createGroup);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const valid = name.trim().length > 0 && selected.length > 0;

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const create = () => {
    if (!valid) return;
    const id = createGroup(name.trim(), selected);
    router.replace({ pathname: '/conversation/[id]', params: { id } });
  };

  return (
    <Screen edges={['top']}>
      <BackHeader
        title="New group"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Create group" disabled={!valid} onPress={create}>
            <Text variant="callout" tone={valid ? 'accent' : 'tertiary'}>
              Create
            </Text>
          </Pressable>
        }
      />

      <View style={{ paddingHorizontal: theme.space.xl }}>
        <Surface variant="flat" style={{ paddingHorizontal: theme.space.lg, height: 52, justifyContent: 'center' }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Group name"
            placeholderTextColor={theme.colors.inkTertiary}
            style={{ color: theme.colors.ink, fontFamily: fontFamily.body, fontSize: 17 }}
          />
        </Surface>
      </View>

      <ListSectionLabel label={selected.length > 0 ? `${selected.length} selected` : 'Add members'} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space['6xl'] }} keyboardShouldPersistTaps="handled">
        {users.map((user) => {
          const on = selected.includes(user.id);
          return (
            <Pressable
              key={user.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={user.displayName}
              onPress={() => toggle(user.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space.md,
                paddingHorizontal: theme.space.xl,
                paddingVertical: theme.space.sm,
                backgroundColor: pressed ? theme.colors.surface : 'transparent',
              })}>
              <Avatar name={user.displayName} seed={user.id} url={user.avatarUrl} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {user.displayName}
                </Text>
                <Text variant="footnote" tone="secondary">
                  @{user.username}
                </Text>
              </View>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: on ? theme.colors.accent : theme.colors.hairline,
                  backgroundColor: on ? theme.colors.accent : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {on ? <Icon icon={Check} size={14} tone="onAccent" strokeWidth={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
