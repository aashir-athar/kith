// Recovery phrase: reveal the twelve words, then confirm you have saved them before it counts
// as set. The words are hidden until you deliberately reveal them.

import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';

const WORDS = ['harbor', 'violet', 'anchor', 'ember', 'cobalt', 'meadow', 'signal', 'pewter', 'lantern', 'quartz', 'marble', 'thistle'];

export default function RecoveryPhraseScreen() {
  const theme = useTheme();
  const setRecoveryMethod = useSessionStore((s) => s.setRecoveryMethod);
  const [revealed, setRevealed] = useState(false);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm }}>
        <Text variant="headline">Recovery phrase</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={theme.hitSlop} onPress={() => router.back()}>
          <Icon icon={X} tone="secondary" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space['4xl'], gap: theme.space.lg }}>
        <Text variant="body" tone="secondary">
          These twelve words are the only copy of your key. Write them down and keep them offline. Anyone who has them can
          restore your account.
        </Text>
        <Surface variant="flat" style={{ padding: theme.space.lg }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {WORDS.map((word, i) => (
              <View key={word} style={{ width: '50%', flexDirection: 'row', gap: theme.space.sm, paddingVertical: theme.space.xs }}>
                <Text variant="mono" tone="tertiary">
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text variant="body">{revealed ? word : '••••••'}</Text>
              </View>
            ))}
          </View>
        </Surface>

        {revealed ? (
          <Button
            label="I have saved it"
            variant="primary"
            fullWidth
            onPress={() => {
              setRecoveryMethod('phrase');
              router.back();
            }}
          />
        ) : (
          <Button label="Reveal phrase" variant="secondary" fullWidth onPress={() => setRevealed(true)} />
        )}
      </ScrollView>
    </Screen>
  );
}
