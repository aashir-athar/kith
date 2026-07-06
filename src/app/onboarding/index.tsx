// Lever: first-impression trust + challenger stance. The wordmark sits high, the promise is
// bold and plain, the primary action sits in thumb reach. No hype, no phone number.

import { router } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export default function WelcomeScreen() {
  const theme = useTheme();
  return (
    <Screen padded>
      <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: theme.space['4xl'] }}>
        <View style={{ marginTop: theme.space['6xl'] }}>
          <Text variant="displayXl">Kith</Text>
        </View>

        <View style={{ gap: theme.space.md }}>
          <Text variant="displayLg">Private by default. Your people, your keys.</Text>
          <Text variant="body" tone="secondary">
            Every message, call, and group is end to end encrypted from the first tap. No phone number required. Your
            history is yours, and it moves with you.
          </Text>
        </View>

        <View style={{ gap: theme.space.sm }}>
          <Button label="Get started" variant="primary" fullWidth onPress={() => router.push('/onboarding/username')} />
          <Button label="I already have an account" variant="ghost" fullWidth onPress={() => router.replace('/')} />
        </View>
      </View>
    </Screen>
  );
}
