// Lever: first-impression trust + challenger stance. The wordmark sits high, the promise is
// bold and plain, the primary action sits in thumb reach. No hype, no phone number.

import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { OnboardingSteps } from '@/components/ui/OnboardingSteps';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export default function WelcomeScreen() {
  const theme = useTheme();
  return (
    <Screen padded>
      <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: theme.space['4xl'] }}>
        <View style={{ marginTop: theme.space['6xl'] }}>
          <Text variant="caption" tone="accent" style={{ textTransform: 'uppercase', letterSpacing: 4 }}>
            Kith
          </Text>
        </View>

        <View style={{ gap: theme.space.md }}>
          <Text variant="displayLg">Nobody should read your messages. Not even us.</Text>
          <Text variant="body" tone="secondary">
            Kith encrypts every chat, call, and group end to end by default. No phone number, no ads, no backdoor. Your
            history is yours, and it moves with you.
          </Text>
        </View>

        <View style={{ gap: theme.space.md }}>
          <OnboardingSteps current={0} />
          <Button label="Create my account" variant="primary" fullWidth onPress={() => router.push('/onboarding/username')} />
          <Button label="I already have an account" variant="secondary" fullWidth onPress={() => router.push('/onboarding/restore')} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="How Kith protects you"
            onPress={() => router.push('/security-explainer')}
            style={{ alignSelf: 'center', paddingVertical: theme.space.xs }}>
            <Text variant="footnote" tone="secondary">
              How Kith protects you
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
