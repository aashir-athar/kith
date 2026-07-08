// Account. Identity is server-authenticated; delete is a real, confirmed erasure that removes the
// account from the relay and wipes every key and the encrypted history from this device.

import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { BACKEND_ENABLED } from '@/net/config';
import { useChatStore } from '@/stores/useChatStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function AccountScreen() {
  const theme = useTheme();
  const user = useSessionStore((s) => s.currentUser);
  const recoveryMethod = useSessionStore((s) => s.recoveryMethod);
  const recoveryLabel = recoveryMethod === 'phrase' ? 'Backed up' : 'Not backed up';
  const serverToken = useSessionStore((s) => s.serverToken);
  const wipeLocal = useSessionStore((s) => s.wipeLocal);

  const divider = (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline, marginLeft: theme.space.xl }} />
  );

  const eraseEverything = async () => {
    // Server first, so the copy stays true: the relay account is gone before we wipe the device.
    if (BACKEND_ENABLED) {
      if (!serverToken) return;
      try {
        await api.deleteAccount(serverToken);
      } catch {
        Alert.alert('Could not delete your account', 'The relay is unreachable. Check your connection and try again.');
        return;
      }
    }
    await useChatStore.persist.clearStorage();
    useChatStore.setState({ conversations: [], messages: {} });
    await wipeLocal();
    router.replace(BACKEND_ENABLED ? '/onboarding' : '/');
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete account',
      BACKEND_ENABLED
        ? 'This deletes your account and messages from the Kith relay and erases your keys and encrypted history from this phone. It cannot be undone.'
        : 'This erases your keys and encrypted history from this phone and signs you out. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void eraseEverything() },
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
          <SettingsRow label="Recovery phrase" value={recoveryLabel} onPress={() => router.push('/settings/recovery')} />
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
