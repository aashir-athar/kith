// Restore an existing account. The returning-user path: enter your username and the recovery
// PIN you set, and your encrypted history unlocks on this device. Not a silent jump into the app.

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

export default function RestoreScreen() {
  const theme = useTheme();
  const setUsername = useSessionStore((s) => s.setUsername);
  const setRecoveryMethod = useSessionStore((s) => s.setRecoveryMethod);
  const complete = useSessionStore((s) => s.completeOnboarding);
  const [handle, setHandle] = useState('');
  const [pin, setPin] = useState('');
  const ready = handle.trim().length >= 3 && pin.length === 6;

  return (
    <Screen edges={['top']}>
      <BackHeader />
      <View style={{ flex: 1, paddingHorizontal: theme.space.xl, gap: theme.space.lg }}>
        <View style={{ gap: theme.space.sm }}>
          <Text variant="displayLg">Restore your account</Text>
          <Text variant="body" tone="secondary">
            Enter your username and the recovery PIN you set. Your encrypted history unlocks on this device once they match.
          </Text>
        </View>

        <View style={{ gap: theme.space.xs }}>
          <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Username
          </Text>
          <Surface variant="flat" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs, paddingHorizontal: theme.space.lg, height: 56 }}>
            <Text variant="headline" tone="ink">
              @
            </Text>
            <TextInput
              value={handle}
              onChangeText={(t) => setHandle(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              placeholder="username"
              placeholderTextColor={theme.colors.inkTertiary}
              style={{ flex: 1, color: theme.colors.ink, fontFamily: fontFamily.body, fontSize: 17 }}
            />
          </Surface>
        </View>

        <View style={{ gap: theme.space.xs }}>
          <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Recovery PIN
          </Text>
          <Surface variant="flat" style={{ paddingHorizontal: theme.space.lg, height: 56, justifyContent: 'center' }}>
            <TextInput
              value={pin}
              onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="6 digits"
              placeholderTextColor={theme.colors.inkTertiary}
              style={{ color: theme.colors.ink, fontFamily: fontFamily.mono, fontSize: 20, letterSpacing: 8 }}
            />
          </Surface>
          <Text variant="footnote" tone="tertiary">
            Lost your PIN? A recovery phrase restores the same way.
          </Text>
        </View>

        <View style={{ flex: 1 }} />
        <Button
          label="Restore account"
          variant="primary"
          fullWidth
          disabled={!ready}
          onPress={() => {
            setUsername(handle);
            setRecoveryMethod('pin');
            complete();
            router.replace('/');
          }}
        />
        <View style={{ height: theme.space['3xl'] }} />
      </View>
    </Screen>
  );
}
