// Lever: control + transparency. The one fully-wired screen in the shell: a real appearance
// switch (system/light/dark, persisted) and an honest about card. No dead rows.

import Constants from 'expo-constants';
import { ScrollView, View } from 'react-native';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';

const MODES: readonly SegmentOption<ThemeMode>[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function YouScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <Header title="You" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: theme.space.xl,
          paddingBottom: theme.space['6xl'],
          gap: theme.space.xl,
        }}>
        <View style={{ gap: theme.space.sm }}>
          <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Appearance
          </Text>
          <SegmentedControl options={MODES} value={theme.mode} onChange={theme.setMode} />
        </View>

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
