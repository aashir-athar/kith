// Sign back in on this device. The identity key is already in the secure store, so we re-verify
// it by signing a server challenge; no PIN theatre. Cross-device restore (recovering the key from
// a PIN/phrase on a fresh device) is a later addition, and the screen says so honestly.

import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { BACKEND_ENABLED } from '@/net/config';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/typography';

export default function RestoreScreen() {
  const theme = useTheme();
  const setUsername = useSessionStore((s) => s.setUsername);
  const complete = useSessionStore((s) => s.completeOnboarding);
  const loginWithServer = useSessionStore((s) => s.loginWithServer);
  const [handle, setHandle] = useState('');
  const ready = handle.trim().length >= 3;

  return (
    <Screen edges={['top']}>
      <BackHeader />
      <View style={{ flex: 1, paddingHorizontal: theme.space.xl, gap: theme.space.lg }}>
        <View style={{ gap: theme.space.sm }}>
          <Text variant="displayLg">Sign back in</Text>
          <Text variant="body" tone="secondary">
            Your keys are already on this device. Enter your username and we re-verify it is you, no password to type.
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
          <Text variant="footnote" tone="tertiary">
            New phone? Restoring from a recovery PIN or phrase is coming soon.
          </Text>
        </View>

        <View style={{ flex: 1 }} />
        <Button
          label="Sign in on this device"
          variant="primary"
          fullWidth
          disabled={!ready}
          onPress={async () => {
            if (BACKEND_ENABLED) {
              try {
                await loginWithServer(handle);
              } catch {
                Alert.alert('Could not sign in', 'Check the username, or that this device holds your keys. Restoring on a new device is not available yet.');
                return;
              }
            } else {
              setUsername(handle);
              complete();
            }
            router.replace('/');
          }}
        />
        <View style={{ height: theme.space['3xl'] }} />
      </View>
    </Screen>
  );
}
