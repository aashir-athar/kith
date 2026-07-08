// Recovery. There is one honest recovery path in a zero-knowledge messenger: a phrase you hold.
// The identity is derived from a twelve-word seed, so writing it down is what lets a new phone sign
// back in. We create the account here (which mints the phrase) and then require you to back it up
// before onboarding completes; no PIN theatre, nothing claims "set" until it is.

import { router } from 'expo-router';
import { KeyRound, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { OnboardingSteps } from '@/components/ui/OnboardingSteps';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { bootstrapIdentity, hasIdentity } from '@/crypto/e2e';
import { BACKEND_ENABLED } from '@/net/config';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';

function Point({ icon, title, body }: { icon: typeof KeyRound; title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.space.md, alignItems: 'flex-start' }}>
      <Icon icon={icon} tone="accent" />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="footnote" tone="secondary">
          {body}
        </Text>
      </View>
    </View>
  );
}

export default function RecoveryScreen() {
  const theme = useTheme();
  const registerWithServer = useSessionStore((s) => s.registerWithServer);
  const serverToken = useSessionStore((s) => s.serverToken);
  const user = useSessionStore((s) => s.currentUser);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      if (BACKEND_ENABLED) {
        if (!serverToken) await registerWithServer(user.username, user.displayName);
      } else if (!(await hasIdentity())) {
        await bootstrapIdentity();
      }
    } catch {
      setBusy(false);
      Alert.alert('Could not create your account', 'The relay is unreachable. Check your connection and try again.');
      return;
    }
    setBusy(false);
    router.push({ pathname: '/recovery-phrase', params: { onboarding: '1' } });
  };

  return (
    <Screen edges={['top']}>
      <BackHeader />
      <OnboardingSteps current={2} />
      <View style={{ flex: 1, paddingHorizontal: theme.space.xl, gap: theme.space.xl }}>
        <View style={{ gap: theme.space.sm }}>
          <Text variant="displayLg">Your key to get back in</Text>
          <Text variant="body" tone="secondary">
            Your account lives in a twelve-word recovery phrase. It is the one way back if you lose
            this phone, so you will save it next.
          </Text>
        </View>

        <Surface variant="flat" style={{ padding: theme.space.lg, gap: theme.space.lg }}>
          <Point icon={KeyRound} title="You hold the only copy" body="The phrase is generated on this device and never leaves it. Kith cannot see it or reset it." />
          <Point icon={ShieldCheck} title="It restores everything you send next" body="Enter it on a new phone to sign back in as you and pick up your conversations." />
        </Surface>

        <View style={{ flex: 1 }} />
        <Button label={busy ? 'Creating your account' : 'Create account and save phrase'} variant="primary" fullWidth disabled={busy} onPress={create} />
        <View style={{ height: theme.space['3xl'] }} />
      </View>
    </Screen>
  );
}
