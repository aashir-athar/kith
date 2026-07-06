// Three-step progress indicator for the onboarding funnel. Makes commitment visible so
// drop-off does not feel arbitrary.

import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function OnboardingSteps({ current, total = 3 }: { current: number; total?: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.space.xs, justifyContent: 'center', paddingVertical: theme.space.sm }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === current ? theme.colors.accent : theme.colors.hairline,
          }}
        />
      ))}
    </View>
  );
}
