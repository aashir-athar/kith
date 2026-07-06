// Lever: control + transparency. Profile up top, a real appearance switch, and honest entry
// points into the deeper settings. No dead rows.

import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Bell, ChevronRight, ShieldCheck, UserPlus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';

const MODES: readonly SegmentOption<ThemeMode>[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function YouScreen() {
  const theme = useTheme();
  const user = useSessionStore((s) => s.currentUser);

  const divider = (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline, marginLeft: theme.space.xl }} />
  );

  return (
    <Screen>
      <Header title="You" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.space.xl,
          paddingBottom: theme.space['6xl'],
          gap: theme.space.xl,
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          onPress={() => router.push('/settings/profile')}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: theme.space.lg, opacity: pressed ? 0.7 : 1 })}>
          <Avatar name={user.displayName} seed={user.id} url={user.avatarUrl} size={64} />
          <View style={{ flex: 1 }}>
            <Text variant="title" numberOfLines={1}>
              {user.displayName}
            </Text>
            <Text variant="callout" tone="secondary">
              @{user.username}
            </Text>
          </View>
          <Icon icon={ChevronRight} size={20} tone="tertiary" />
        </Pressable>

        <View style={{ gap: theme.space.sm }}>
          <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Appearance
          </Text>
          <SegmentedControl options={MODES} value={theme.mode} onChange={theme.setMode} />
        </View>

        <Surface variant="flat" style={{ overflow: 'hidden' }}>
          <SettingsRow icon={ShieldCheck} label="Privacy & security" onPress={() => router.push('/settings/privacy')} />
          {divider}
          <SettingsRow icon={Bell} label="Notifications" onPress={() => router.push('/settings/notifications')} />
          {divider}
          <SettingsRow icon={UserPlus} label="Account" onPress={() => router.push('/settings/account')} />
        </Surface>

        <View style={{ gap: theme.space.sm }}>
          <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            About
          </Text>
          <Surface variant="flat" style={{ padding: theme.space.xl, gap: theme.space.xs }}>
            <Text variant="title">Kith</Text>
            <Text variant="callout" tone="secondary">
              Private by default. Your people, your keys.
            </Text>
            <Text variant="mono" tone="tertiary">
              v{Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </Surface>
        </View>
      </ScrollView>
    </Screen>
  );
}
