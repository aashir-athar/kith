// Recovery. A hardware-backed PIN is the default (never seed-phrase-or-lose-everything).
// The two options are a real selectable choice, not dead rows.

import { router } from 'expo-router';
import { Check, KeyRound, Lock, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';

type Method = 'pin' | 'phrase';

function Option({
  method,
  selected,
  icon,
  title,
  hint,
  onSelect,
}: {
  method: Method;
  selected: boolean;
  icon: LucideIcon;
  title: string;
  hint: string;
  onSelect: (m: Method) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      onPress={() => onSelect(method)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.md,
        padding: theme.space.lg,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: selected ? theme.colors.accent : theme.colors.hairline,
        backgroundColor: theme.colors.surface,
      }}>
      <Icon icon={icon} tone={selected ? 'accent' : 'secondary'} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="footnote" tone="secondary">{hint}</Text>
      </View>
      {selected ? <Icon icon={Check} tone="accent" /> : null}
    </Pressable>
  );
}

export default function RecoveryScreen() {
  const theme = useTheme();
  const complete = useSessionStore((s) => s.completeOnboarding);
  const [method, setMethod] = useState<Method>('pin');

  return (
    <Screen edges={['top']}>
      <BackHeader />
      <View style={{ flex: 1, paddingHorizontal: theme.space.xl, gap: theme.space.lg }}>
        <View style={{ gap: theme.space.sm }}>
          <Text variant="displayLg">Secure your account</Text>
          <Text variant="body" tone="secondary">
            Lose your phone, keep your messages. A PIN unlocks your encrypted history from a hardware backed vault, guess
            limited so no one can brute force it. Want to hold the only key yourself? Use a recovery phrase instead.
          </Text>
        </View>

        <View style={{ gap: theme.space.sm }}>
          <Option method="pin" selected={method === 'pin'} icon={Lock} title="Recovery PIN" hint="Recommended. Hardware backed, guess limited." onSelect={setMethod} />
          <Option method="phrase" selected={method === 'phrase'} icon={KeyRound} title="Recovery phrase" hint="Advanced. You hold the only copy." onSelect={setMethod} />
        </View>

        <View style={{ flex: 1 }} />
        <Button
          label="Finish"
          variant="primary"
          fullWidth
          onPress={() => {
            complete();
            router.replace('/');
          }}
        />
        <View style={{ height: theme.space['3xl'] }} />
      </View>
    </Screen>
  );
}
