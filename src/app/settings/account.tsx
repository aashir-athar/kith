// Account. Identity is server-authenticated and never lost; delete is guarded by a confirm.

import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function AccountScreen() {
  const theme = useTheme();
  const user = useSessionStore((s) => s.currentUser);
  const recoveryMethod = useSessionStore((s) => s.recoveryMethod);
  const recoveryLabel = recoveryMethod === 'pin' ? 'On' : recoveryMethod === 'phrase' ? 'Phrase' : 'Not set';

  const divider = (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline, marginLeft: theme.space.xl }} />
  );

  const confirmDelete = () =>
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and your encrypted history on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => undefined },
      ],
    );

  return (
    <Screen edges={['top']}>
      <BackHeader title="Account" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space['6xl'] }}>
        <ListSectionLabel label="Identity" />
        <Surface variant="flat" style={{ marginHorizontal: theme.space.xl, overflow: 'hidden' }}>
          <SettingsRow label="Username" value={`@${user.username}`} onPress={() => router.push('/settings/profile')} />
          {divider}
          <SettingsRow label="Display name" value={user.displayName} onPress={() => router.push('/settings/profile')} />
          {divider}
          <SettingsRow label="Recovery PIN" value={recoveryLabel} onPress={() => router.push('/settings/recovery')} />
        </Surface>

        <ListSectionLabel label="Data" />
        <Surface variant="flat" style={{ marginHorizontal: theme.space.xl, overflow: 'hidden' }}>
          <SettingsRow label="Export account data" onPress={() => router.push('/settings/export')} />
        </Surface>

        <ListSectionLabel label="Danger zone" />
        <Surface
          variant="flat"
          style={{ marginHorizontal: theme.space.xl, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.danger }}>
          <SettingsRow icon={Trash2} label="Delete account" danger onPress={confirmDelete} />
        </Surface>
      </ScrollView>
    </Screen>
  );
}
