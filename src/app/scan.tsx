// Scan a code. A real on-device camera scanner (expo-camera). Asks for the camera with a plain
// explanation, reads a Kith QR, and hands off. No phone number: this is how you add someone in
// person.

import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useRef } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { users } from '@/lib/mockData';
import { BACKEND_ENABLED } from '@/net/config';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function ScanScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const startDirectWithUsername = useChatStore((s) => s.startDirectWithUsername);
  const createDirect = useChatStore((s) => s.createDirect);
  const handled = useRef(false);

  const openUser = async (username: string) => {
    if (BACKEND_ENABLED) {
      const id = await startDirectWithUsername(username);
      if (id) {
        router.replace({ pathname: '/conversation/[id]', params: { id } });
        return;
      }
    } else {
      const u = users.find((x) => x.username === username);
      if (u) {
        router.replace({ pathname: '/conversation/[id]', params: { id: createDirect(u.id) } });
        return;
      }
    }
    handled.current = false;
    Alert.alert('No such user', `No one is registered as @${username}.`);
  };

  const onScan = ({ data }: { data: string }) => {
    if (handled.current) return;
    const match = /^kith:\/\/user\/([a-z0-9_]{3,32})$/i.exec(data.trim());
    if (!match) {
      Alert.alert('Not a Kith code', 'That QR code is not a Kith contact code.');
      return;
    }
    handled.current = true;
    void openUser(match[1]!.toLowerCase());
  };

  const closeButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={theme.hitSlop}
      onPress={() => router.back()}
      style={{
        position: 'absolute',
        top: insets.top + theme.space.sm,
        left: theme.space.lg,
        width: 44,
        height: 44,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.scrim,
        borderWidth: 1,
        borderColor: 'rgba(250,250,250,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon icon={X} tone="ink" />
    </Pressable>
  );

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.base }} />;
  }

  if (!permission.granted) {
    return (
      <Screen edges={['top', 'bottom']} padded>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.lg }}>
          <Text variant="displayLg" center>
            Scan a code
          </Text>
          <Text variant="body" tone="secondary" center>
            Kith needs the camera to scan a person's code. The camera runs on device; nothing is uploaded.
          </Text>
          <Button label="Allow camera" variant="primary" fullWidth onPress={requestPermission} />
          <Pressable accessibilityRole="button" accessibilityLabel="Not now" hitSlop={theme.hitSlop} onPress={() => router.back()}>
            <Text variant="footnote" tone="secondary">
              Not now
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.base }}>
      <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <View style={{ width: 240, height: 240, borderRadius: theme.radius.lg, borderWidth: 2, borderColor: '#FFFFFF' }} />
      </View>

      <View style={{ position: 'absolute', bottom: insets.bottom + theme.space['3xl'], left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
        <Text variant="footnote" style={{ color: '#FFFFFF' }}>
          Point the camera at a Kith code
        </Text>
      </View>

      {closeButton}
    </View>
  );
}
