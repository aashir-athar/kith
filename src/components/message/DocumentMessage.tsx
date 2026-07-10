// Document message content: file glyph, name, size. Tapping downloads and decrypts the file into
// the cache (received) or uses the local copy (sent), then opens the OS share/open sheet. The
// plaintext only ever exists on device.

import * as Sharing from 'expo-sharing';
import { FileText } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { downloadMediaToCache } from '@/net/media';
import { useTheme } from '@/theme/ThemeProvider';
import type { Message } from '@/types/models';

export function DocumentMessage({ message }: { message: Message }) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const uri = message.blob ? await downloadMediaToCache(message.blob, message.fileName) : message.mediaUrl;
      if (uri && uri.includes('://') && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri);
    } catch {
      // could not fetch or open; leave the card in place
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${message.fileName ?? 'document'}`}
      onPress={open}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, minWidth: 200, opacity: busy ? 0.6 : 1 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon icon={FileText} size={20} tone="secondary" />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="subhead" numberOfLines={1}>
          {message.fileName ?? 'Document'}
        </Text>
        <Text variant="caption" tone="tertiary">
          {message.fileSize ?? ''}
        </Text>
      </View>
    </Pressable>
  );
}
