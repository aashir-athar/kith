// Privacy & security. Visibility toggles and metadata posture. The footnote states the
// default plainly: end to end encrypted, the server relays ciphertext it cannot read.

import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Toggle } from '@/components/ui/Toggle';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export default function PrivacyScreen() {
  const theme = useTheme();
  const [readReceipts, setReadReceipts] = useState(true);
  const [typing, setTyping] = useState(true);
  const [lastSeen, setLastSeen] = useState(false);
  const [sealed, setSealed] = useState(true);
  const [disappearing, setDisappearing] = useState('Off');
  const cycleDisappearing = () =>
    setDisappearing((current) => {
      const options = ['Off', '24 hours', '7 days'];
      return options[(options.indexOf(current) + 1) % options.length] ?? 'Off';
    });

  const divider = (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline, marginLeft: theme.space.xl }} />
  );
  const toggle = (label: string, value: boolean, set: (v: boolean) => void) => (
    <SettingsRow label={label} onPress={() => set(!value)} right={<Toggle value={value} onValueChange={set} accessibilityLabel={label} />} />
  );

  return (
    <Screen edges={['top']}>
      <BackHeader title="Privacy & security" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space['6xl'] }}>
        <View style={{ paddingHorizontal: theme.space.xl, paddingTop: theme.space.sm, paddingBottom: theme.space.md }}>
          <Text variant="callout" tone="secondary">
            Kith is end to end encrypted by default. The server relays ciphertext it cannot read.
          </Text>
        </View>

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
          <SettingsRow label="Disappearing messages" value={disappearing} onPress={cycleDisappearing} />
        </Surface>
      </ScrollView>
    </Screen>
  );
}
