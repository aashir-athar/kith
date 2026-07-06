// Recovery. A hardware-backed PIN is the default (never seed-phrase-or-lose-everything).
// Choosing a method opens a real set-and-confirm flow; Finish is gated until one is set, so
// the account is genuinely secured before onboarding completes.

import { router } from 'expo-router';
import { Check, KeyRound, Lock, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { OnboardingSteps } from '@/components/ui/OnboardingSteps';
import { Text } from '@/components/ui/Text';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';

function Option({
  selected,
  icon,
  title,
  hint,
  onPress,
}: {
  selected: boolean;
  icon: LucideIcon;
  title: string;
  hint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      onPress={onPress}
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
        <Text variant="footnote" tone="secondary">
          {hint}
        </Text>
      </View>
      {selected ? <Icon icon={Check} tone="accent" /> : null}
    </Pressable>
  );
}

export default function RecoveryScreen() {
  const theme = useTheme();
  const complete = useSessionStore((s) => s.completeOnboarding);
  const method = useSessionStore((s) => s.recoveryMethod);

  return (
    <Screen edges={['top']}>
      <BackHeader />
      <OnboardingSteps current={2} />
      <View style={{ flex: 1, paddingHorizontal: theme.space.xl, gap: theme.space.lg }}>
        <View style={{ gap: theme.space.sm }}>
          <Text variant="displayLg">Secure your account</Text>
          <Text variant="body" tone="secondary">
            Lose your phone, keep your messages. Set one now: a PIN is hardware backed and guess limited, or hold a
            recovery phrase yourself.
          </Text>
        </View>

        <View style={{ gap: theme.space.sm }}>
          <Option
            selected={method === 'pin'}
            icon={Lock}
            title="Recovery PIN"
            hint="Recommended. Hardware backed, guess limited."
            onPress={() => router.push('/recovery-pin')}
          />
          <Option
            selected={method === 'phrase'}
            icon={KeyRound}
            title="Recovery phrase"
            hint="Advanced. You hold the only copy."
            onPress={() => router.push('/recovery-phrase')}
          />
        </View>

        {method === 'none' ? (
          <Text variant="footnote" tone="warning">
            Choose one to continue. Nothing is secured until you do.
          </Text>
        ) : null}

        <View style={{ flex: 1 }} />
        <Button
          label="Finish"
          variant="primary"
          fullWidth
          disabled={method === 'none'}
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
