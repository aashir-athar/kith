// My code. The other half of the scanner: your shareable identity as a QR of your handle. No
// phone number, no server lookup, just your username encoded on device.

import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function MyCodeScreen() {
  const theme = useTheme();
  const user = useSessionStore((s) => s.currentUser);
  const link = `kith://user/${user.username}`;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm }}>
        <Text variant="headline">My code</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={theme.hitSlop} onPress={() => router.back()}>
          <Icon icon={X} tone="secondary" />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.xl, paddingHorizontal: theme.space.xl }}>
        <Avatar name={user.displayName} seed={user.id} url={user.avatarUrl} size={72} />
        <View style={{ alignItems: 'center', gap: theme.space.xxs }}>
          <Text variant="title">{user.displayName}</Text>
          <Text variant="callout" tone="secondary">
            @{user.username}
          </Text>
        </View>
        <View style={{ padding: theme.space.xl, borderRadius: theme.radius.lg, backgroundColor: '#FFFFFF' }}>
          <QRCode value={link} size={220} color="#0B0B0C" backgroundColor="#FFFFFF" />
        </View>
        <Text variant="footnote" tone="secondary" center>
          Others scan this to reach you. No phone number, just your handle.
        </Text>
      </View>

      <View style={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space.lg }}>
        <Button
          label="Share my code"
          variant="secondary"
          fullWidth
          onPress={() => Alert.alert('Share', `Share your handle: ${link}`)}
        />
      </View>
    </Screen>
  );
}
