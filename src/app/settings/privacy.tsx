// Privacy & security. Visibility toggles and metadata posture. The footnote states the
// default plainly: end to end encrypted, the server relays ciphertext it cannot read.

import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export default function PrivacyScreen() {
  const theme = useTheme();
  const [readReceipts, setReadReceipts] = useState(true);
  const [typing, setTyping] = useState(true);
  const [lastSeen, setLastSeen] = useState(false);
  const [sealed, setSealed] = useState(true);

  const track = { true: theme.colors.accent, false: theme.colors.overlay };
  const divider = (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline, marginLeft: theme.space.xl }} />
  );
  const toggle = (label: string, value: boolean, set: (v: boolean) => void) => (
    <SettingsRow
      label={label}
      onPress={() => set(!value)}
      right={
        <Switch
          value={value}
          onValueChange={set}
          trackColor={track}
          thumbColor={theme.colors.ink}
          ios_backgroundColor={theme.colors.overlay}
        />
      }
    />
  );

  return (
    <Screen edges={['top']}>
      <BackHeader title="Privacy & security" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space['6xl'] }}>
        <ListSectionLabel label="Visibility" />
        <Surface variant="flat" style={{ marginHorizontal: theme.space.xl, overflow: 'hidden' }}>
          {toggle('Read receipts', readReceipts, setReadReceipts)}
          {divider}
          {toggle('Typing indicators', typing, setTyping)}
          {divider}
          {toggle('Last seen', lastSeen, setLastSeen)}
        </Surface>

        <ListSectionLabel label="Metadata" />
        <Surface variant="flat" style={{ marginHorizontal: theme.space.xl, overflow: 'hidden' }}>
          {toggle('Sealed sender', sealed, setSealed)}
          {divider}
          <SettingsRow label="Disappearing messages" value="Off" />
          {divider}
          <SettingsRow label="Safety number" value="Verified" />
        </Surface>

        <View style={{ paddingHorizontal: theme.space.xl, paddingTop: theme.space.lg }}>
          <Text variant="footnote" tone="tertiary">
            Kith is end to end encrypted by default. The server relays ciphertext it cannot read.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
