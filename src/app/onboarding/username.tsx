// Username identity. Replaces the phone number. Sanitized to a safe handle as you type.

import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/typography';

export default function UsernameScreen() {
  const theme = useTheme();
  const setUsername = useSessionStore((s) => s.setUsername);
  const [value, setValue] = useState('');
  const valid = value.length >= 3;

  return (
    <Screen edges={['top']}>
      <BackHeader />
      <View style={{ flex: 1, paddingHorizontal: theme.space.xl, gap: theme.space.lg }}>
        <View style={{ gap: theme.space.sm }}>
          <Text variant="displayLg">Choose a username</Text>
          <Text variant="body" tone="secondary">
            Usernames replace phone numbers on Kith. People find you by your handle, and you can rotate it any time.
          </Text>
        </View>

        <Surface
          variant="flat"
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs, paddingHorizontal: theme.space.lg, height: 56 }}>
          <Text variant="headline" tone="tertiary">@</Text>
          <TextInput
            value={value}
            onChangeText={(t) => setValue(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            placeholder="username"
            placeholderTextColor={theme.colors.inkTertiary}
            style={{ flex: 1, color: theme.colors.ink, fontFamily: fontFamily.body, fontSize: 17 }}
          />
        </Surface>

        <Text variant="footnote" tone={valid ? 'success' : 'tertiary'}>
          {valid ? 'Looks available' : '3 or more characters: letters, numbers, and underscores'}
        </Text>

        <View style={{ flex: 1 }} />
        <Button
          label="Continue"
          variant="primary"
          fullWidth
          disabled={!valid}
          onPress={() => {
            setUsername(value);
            router.push('/onboarding/recovery');
          }}
        />
        <View style={{ height: theme.space['3xl'] }} />
      </View>
    </Screen>
  );
}
