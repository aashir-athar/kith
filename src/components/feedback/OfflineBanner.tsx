// Honest offline state: reads real device connectivity. Shows only when the device is actually
// offline, so the reassurance is never fake. Hidden while connectivity is still unknown.

import * as Network from 'expo-network';
import { CloudOff } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export function OfflineBanner() {
  const theme = useTheme();
  const state = Network.useNetworkState();
  const offline = state.isConnected === false || state.isInternetReachable === false;
  if (!offline) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm,
        paddingHorizontal: theme.space.xl,
        paddingVertical: theme.space.sm,
        backgroundColor: theme.colors.surface,
      }}>
      <Icon icon={CloudOff} size={16} tone="secondary" />
      <Text variant="footnote" tone="secondary">
        No connection. Messages send the moment you are back online.
      </Text>
    </View>
  );
}
