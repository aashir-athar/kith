// Create a community. Names a real room, adds it to the store, and drops you into it. No dead
// FAB: pressing New community lands here.

import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useCommunityStore } from '@/stores/useCommunityStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/typography';

export default function NewCommunityScreen() {
  const theme = useTheme();
  const createCommunity = useCommunityStore((s) => s.createCommunity);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const valid = name.trim().length >= 2;

  const field = (
    value: string,
    onChange: (t: string) => void,
    placeholder: string,
    label: string,
    multiline = false,
  ) => (
    <View style={{ gap: theme.space.xs }}>
      <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
      <Surface variant="flat" style={{ paddingHorizontal: theme.space.lg, paddingVertical: multiline ? theme.space.md : 0, minHeight: 56, justifyContent: 'center' }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.inkTertiary}
          multiline={multiline}
          autoFocus={!multiline}
          style={{ color: theme.colors.ink, fontFamily: fontFamily.body, fontSize: 17, minHeight: multiline ? 72 : undefined }}
        />
      </Surface>
    </View>
  );

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm }}>
        <Text variant="headline">New community</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={theme.hitSlop} onPress={() => router.back()}>
          <Icon icon={X} tone="secondary" />
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: theme.space.xl, gap: theme.space.lg }}>
        <Text variant="body" tone="secondary">
          Start an invite-only room. Every message stays encrypted between members, even in a crowd.
        </Text>
        {field(name, setName, 'Frontline Press', 'Name')}
        {field(description, setDescription, 'What is this room for?', 'Description', true)}

        <View style={{ flex: 1 }} />
        <Button
          label="Create community"
          variant="primary"
          fullWidth
          disabled={!valid}
          onPress={() => {
            const community = createCommunity(name, description);
            router.replace('/community/' + community.id);
          }}
        />
      </View>
    </Screen>
  );
}
