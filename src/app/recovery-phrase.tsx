// Recovery phrase. Reveals the real twelve words derived from this account's identity seed, then
// confirms you have saved them. The phrase is loaded from secure-store, never hardcoded; it is the
// only way back into the account on a new device, and Kith never sees it.

import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { getRecoveryPhrase } from '@/crypto/e2e';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function RecoveryPhraseScreen() {
  const theme = useTheme();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const fromOnboarding = onboarding === '1';
  const setRecoveryMethod = useSessionStore((s) => s.setRecoveryMethod);
  const complete = useSessionStore((s) => s.completeOnboarding);
  const [words, setWords] = useState<string[] | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let active = true;
    void getRecoveryPhrase().then((phrase) => {
      if (active) setWords(phrase ? phrase.split(' ') : []);
    });
    return () => {
      active = false;
    };
  }, []);

  const slots = words ?? Array.from({ length: 12 }, () => '');

  const onConfirm = () => {
    setRecoveryMethod('phrase');
    if (fromOnboarding) {
      complete();
      router.replace('/');
    } else {
      router.back();
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm }}>
        <Text variant="headline">Recovery phrase</Text>
        {!fromOnboarding ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={theme.hitSlop} onPress={() => router.back()}>
            <Icon icon={X} tone="secondary" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space['4xl'], gap: theme.space.lg }}>
        <Text variant="body" tone="secondary">
          These twelve words rebuild your account on a new phone. Write them down and keep them
          offline. Anyone who has them can sign in as you, and Kith can never recover them for you.
        </Text>
        <Surface variant="flat" style={{ padding: theme.space.lg }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {slots.map((word, i) => (
              <View key={i} style={{ width: '50%', flexDirection: 'row', gap: theme.space.sm, paddingVertical: theme.space.xs }}>
                <Text variant="mono" tone="tertiary">
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text variant="body">{revealed && word ? word : '••••••'}</Text>
              </View>
            ))}
          </View>
        </Surface>

        {words && words.length === 0 ? (
          <Text variant="footnote" tone="warning">
            No recovery phrase is stored on this device. It is created with your account; sign in on
            the device that holds your keys.
          </Text>
        ) : revealed ? (
          <Button label="I have saved it" variant="primary" fullWidth onPress={onConfirm} />
        ) : (
          <Button label="Reveal phrase" variant="secondary" fullWidth disabled={!words} onPress={() => setRevealed(true)} />
        )}
      </ScrollView>
    </Screen>
  );
}
