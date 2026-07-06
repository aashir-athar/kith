// Notification controls. Previews off by default keeps message content off the lock screen.

import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { useTheme } from '@/theme/ThemeProvider';

export default function NotificationsScreen() {
  const theme = useTheme();
  const [messages, setMessages] = useState(true);
  const [reactions, setReactions] = useState(false);
  const [callsOn, setCallsOn] = useState(true);
  const [previews, setPreviews] = useState(false);

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
      <BackHeader title="Notifications" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space['6xl'] }}>
        <ListSectionLabel label="Alerts" />
        <Surface variant="flat" style={{ marginHorizontal: theme.space.xl, overflow: 'hidden' }}>
          {toggle('Message notifications', messages, setMessages)}
          {divider}
          {toggle('Reactions', reactions, setReactions)}
          {divider}
          {toggle('Calls', callsOn, setCallsOn)}
        </Surface>

        <ListSectionLabel label="Content" />
        <Surface variant="flat" style={{ marginHorizontal: theme.space.xl, overflow: 'hidden' }}>
          {toggle('Show message previews', previews, setPreviews)}
          {divider}
          <SettingsRow label="Quiet hours" value="Off" />
        </Surface>
      </ScrollView>
    </Screen>
  );
}
