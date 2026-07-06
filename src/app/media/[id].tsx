// Full-screen media viewer. Renders local decrypted media only (no third-party fetch), with a
// close ring and share/save controls over a scrim, plus a graceful failure state.

import { router, useLocalSearchParams } from 'expo-router';
import { Download, ImageOff, Share2, X } from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { LocalMedia } from '@/components/ui/LocalMedia';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export default function MediaViewer() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mediaId = typeof id === 'string' ? id : '';
  const failed = mediaId.length === 0;

  const control = (label: string, icon: typeof X, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.scrim,
        borderWidth: 1,
        borderColor: 'rgba(250,250,250,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon icon={icon} tone="ink" />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.base }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {failed ? (
          <View style={{ alignItems: 'center', gap: theme.space.md, paddingHorizontal: theme.space['4xl'] }}>
            <Icon icon={ImageOff} size={32} tone="secondary" />
            <Text variant="body" tone="secondary" center>
              This media could not be loaded. It may have expired or failed to decrypt on this device.
            </Text>
          </View>
        ) : (
          <LocalMedia seed={mediaId} style={{ width: '100%', aspectRatio: 3 / 4 }} />
        )}
      </View>

      <View style={{ position: 'absolute', top: insets.top + theme.space.sm, left: theme.space.lg }}>
        {control('Close', X, () => router.back())}
      </View>

      {failed ? null : (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + theme.space.lg,
            right: theme.space.lg,
            flexDirection: 'row',
            gap: theme.space.md,
          }}>
          {control('Share', Share2, () =>
            Alert.alert('Share', 'Encrypted media stays on device; sharing re-encrypts it for the recipient.'),
          )}
          {control('Save', Download, () => Alert.alert('Save', 'Saved to your device.'))}
        </View>
      )}
    </View>
  );
}
