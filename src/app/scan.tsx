// Scan a code. The in-person add path for a no-phone-number app. Camera wiring (expo-camera)
// drops into the viewfinder; the screen itself is a real destination, not a dead row.

import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export default function ScanScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.base, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.space.lg }}>
        <Text variant="headline">Scan a code</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={theme.hitSlop} onPress={() => router.back()}>
          <Icon icon={X} tone="ink" />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.xl, paddingHorizontal: theme.space.xl }}>
        <View
          style={{
            width: 240,
            height: 240,
            borderRadius: theme.radius.xl,
            borderWidth: 2,
            borderColor: theme.colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text variant="footnote" tone="tertiary">
            Point the camera at a Kith code
          </Text>
        </View>
        <Text variant="body" tone="secondary" center>
          Add someone in person by scanning their code. No phone number, no exposed contacts.
        </Text>
      </View>
    </View>
  );
}
