// Username identity. Replaces the phone number. Sanitized to a safe handle as you type. The
// constraint rule stays visible; live validation, the resolved handle, and the reservation are
// separate elements so guidance never disappears.

import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { OnboardingSteps } from '@/components/ui/OnboardingSteps';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/typography';

export default function UsernameScreen() {
  const theme = useTheme();
  const setUsername = useSessionStore((s) => s.setUsername);
  const [value, setValue] = useState('');
  const valid = value.length >= 3;

  return (
    <Screen edges={['top']}>
      <BackHeader />
      <OnboardingSteps current={1} />
      <View style={{ flex: 1, paddingHorizontal: theme.space.xl, gap: theme.space.lg }}>
        <View style={{ gap: theme.space.sm }}>
          <Text variant="displayLg">Choose a username</Text>
          <Text variant="body" tone="secondary">
            Your handle is how people find you. No phone number, and you can change it any time.
          </Text>
        </View>

        <View style={{ gap: theme.space.xs }}>
          <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Username
          </Text>
          <Surface variant="flat" style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.lg, height: 56 }}>
            <Text variant="headline" tone="ink">
              @
            </Text>
            <View style={{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: theme.space.md, marginHorizontal: theme.space.md, backgroundColor: theme.colors.hairline }} />
            <TextInput
              value={value}
              onChangeText={(t) => setValue(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              placeholder="username"
              placeholderTextColor={theme.colors.inkTertiary}
              style={{ flex: 1, color: theme.colors.ink, fontFamily: fontFamily.body, fontSize: 17 }}
            />
          </Surface>

          <Text variant="footnote" tone="tertiary">
            3 or more characters: letters, numbers, and underscores.
          </Text>

          {valid ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
              <Icon icon={Check} size={15} tone="success" />
              <Text variant="footnote" tone="secondary">
                @{value} looks good. You can change it any time.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1 }} />

        {!valid ? (
          <Text variant="footnote" tone="tertiary" center>
            Enter 3 or more characters to continue.
          </Text>
        ) : null}
        <Button
          label="Continue"
          variant="primary"
          fullWidth
          disabled={!valid}
          onPress={() =>
            Alert.alert('Claim this handle?', `You'll be @${value}. You can change it any time.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Confirm',
                onPress: () => {
                  setUsername(value);
                  router.push('/onboarding/recovery');
                },
              },
            ])
          }
        />
        <View style={{ height: theme.space['3xl'] }} />
      </View>
    </Screen>
  );
}
