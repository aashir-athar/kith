// Sign back in. Two honest paths: on the device that already holds your keys, just re-verify the
// identity by signing a server challenge (no password). On a new phone, paste your twelve-word
// recovery phrase to rebuild the identity, then we log you in and re-publish your keys.

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
  const restoreWithPhrase = useSessionStore((s) => s.restoreWithPhrase);
  const [handle, setHandle] = useState('');
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = handle.trim().length >= 3 && !busy;
  const hasPhrase = phrase.trim().length > 0;

  const submit = async () => {
    const username = handle.trim();
    if (!BACKEND_ENABLED) {
      setUsername(username);
      complete();
      router.replace('/');
      return;
    }
    setBusy(true);
    try {
      if (hasPhrase) {
        await restoreWithPhrase(username, phrase);
      } else {
        await loginWithServer(username);
      }
      router.replace('/');
    } catch {
      Alert.alert(
        'Could not sign in',
        hasPhrase
          ? 'Check the username and that all twelve words are correct and in order.'
          : 'On a new phone, paste your recovery phrase below. Otherwise, check the username and that this device holds your keys.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <BackHeader />
      <View style={{ flex: 1, paddingHorizontal: theme.space.xl, gap: theme.space.lg }}>
        <View style={{ gap: theme.space.sm }}>
          <Text variant="displayLg">Sign back in</Text>
          <Text variant="body" tone="secondary">
            On this phone, just your username. On a new phone, add your recovery phrase and we rebuild
            your account.
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
            Recovery phrase
          </Text>
          <Surface variant="flat" style={{ paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md }}>
            <TextInput
              value={phrase}
              onChangeText={setPhrase}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              placeholder="Twelve words, separated by spaces"
              placeholderTextColor={theme.colors.inkTertiary}
              style={{ color: theme.colors.ink, fontFamily: fontFamily.body, fontSize: 17, minHeight: 72 }}
            />
          </Surface>
          <Text variant="footnote" tone="tertiary">
            Only needed on a new phone. Leave it blank on the device that already has your keys.
          </Text>
        </View>

        <View style={{ flex: 1 }} />
        <Button
          label={busy ? 'Signing in' : hasPhrase ? 'Restore on this phone' : 'Sign in on this device'}
          variant="primary"
          fullWidth
          disabled={!ready}
          onPress={submit}
        />
        <View style={{ height: theme.space['3xl'] }} />
      </View>
    </Screen>
  );
}
