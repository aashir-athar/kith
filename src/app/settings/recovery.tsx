// Recovery settings. One honest path: the recovery phrase. Shows whether it has been backed up and
// lets you view it again to write it down.

import { router } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
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
  const backedUp = method === 'phrase';

  const status = backedUp
    ? 'Your recovery phrase is your way back on a new phone. Kith never sees it, so keep your copy offline.'
    : 'Back up your recovery phrase. Until you do, losing this phone means losing this account.';

  return (
    <Screen edges={['top']}>
      <BackHeader title="Recovery" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space['6xl'], gap: theme.space.lg }}>
        <Text variant="body" tone={backedUp ? 'secondary' : 'warning'}>
          {status}
        </Text>
        <Surface variant="flat" style={{ overflow: 'hidden' }}>
          <SettingsRow
            icon={KeyRound}
            label="View recovery phrase"
            value={backedUp ? 'Backed up' : 'Not backed up'}
            onPress={() => router.push('/recovery-phrase')}
          />
        </Surface>
      </ScrollView>
    </Screen>
  );
}
