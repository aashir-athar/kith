// Recovery settings. Shows the real, honest recovery state and lets you set or change it.

import { router } from 'expo-router';
import { KeyRound, Lock } from 'lucide-react-native';
import { ScrollView } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function RecoverySettingsScreen() {
  const theme = useTheme();
  const method = useSessionStore((s) => s.recoveryMethod);

  const status =
    method === 'pin'
      ? 'A recovery PIN is set. Losing this phone will not lose your history.'
      : method === 'phrase'
        ? 'A recovery phrase is set. You hold the only copy.'
        : 'No recovery is set yet. Right now, losing this phone loses your encrypted history.';

  return (
    <Screen edges={['top']}>
      <BackHeader title="Recovery" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space['6xl'], gap: theme.space.lg }}>
        <Text variant="body" tone={method === 'none' ? 'warning' : 'secondary'}>
          {status}
        </Text>
        <Surface variant="flat" style={{ overflow: 'hidden' }}>
          <SettingsRow
            icon={Lock}
            label="Set a recovery PIN"
            value={method === 'pin' ? 'On' : undefined}
            onPress={() => router.push('/recovery-pin')}
          />
          <SettingsRow
            icon={KeyRound}
            label="Use a recovery phrase"
            value={method === 'phrase' ? 'On' : undefined}
            onPress={() => router.push('/recovery-phrase')}
          />
        </Surface>
      </ScrollView>
    </Screen>
  );
}
