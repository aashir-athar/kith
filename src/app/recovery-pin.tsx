// Set-and-confirm recovery PIN. Real capture: enter six digits, confirm them, and only then
// is the PIN recorded. Nothing claims "set" until it is.

import { router } from 'expo-router';
import { Delete, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
const LEN = 6;

export default function RecoveryPinScreen() {
  const theme = useTheme();
  const setRecoveryMethod = useSessionStore((s) => s.setRecoveryMethod);
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [first, setFirst] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const press = (key: string) => {
    setError('');
    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === '' || pin.length >= LEN) return;
    const next = pin + key;
    if (next.length < LEN) {
      setPin(next);
      return;
    }
    setPin('');
    if (stage === 'enter') {
      setFirst(next);
      setStage('confirm');
      return;
    }
    if (next === first) {
      setRecoveryMethod('pin');
      router.back();
    } else {
      setError('PINs did not match. Start again.');
      setFirst('');
      setStage('enter');
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={theme.hitSlop} onPress={() => router.back()}>
          <Icon icon={X} tone="secondary" />
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', gap: theme.space.md, paddingHorizontal: theme.space.xl }}>
        <Text variant="displayLg" center>
          {stage === 'enter' ? 'Set a recovery PIN' : 'Confirm your PIN'}
        </Text>
        <Text variant="body" tone="secondary" center>
          Six digits, guess limited. It unlocks your encrypted history if you lose this phone.
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.space.md, marginTop: theme.space.lg }}>
          {Array.from({ length: LEN }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: i < pin.length ? theme.colors.accent : theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.hairline,
              }}
            />
          ))}
        </View>
        {error ? (
          <Text variant="footnote" tone="danger">
            {error}
          </Text>
        ) : null}
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.space['4xl'], paddingBottom: theme.space.lg }}>
        {KEYS.map((key, i) => (
          <Pressable
            key={i}
            disabled={key === ''}
            accessibilityRole="button"
            accessibilityLabel={key === 'del' ? 'Delete' : key || 'blank'}
            onPress={() => press(key)}
            style={({ pressed }) => ({
              width: '33.33%',
              height: 72,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed && key ? 0.5 : 1,
            })}>
            {key === 'del' ? <Icon icon={Delete} tone="secondary" /> : key ? <Text variant="title">{key}</Text> : null}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
