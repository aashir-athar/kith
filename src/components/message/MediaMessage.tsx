// Image message content. A received image is downloaded from the relay and decrypted into the cache
// (its plaintext never leaves the device), then rendered from a local file uri. The offline demo
// falls back to a deterministic on-device gradient; nothing is ever fetched from a third party.

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { LocalMedia } from '@/components/ui/LocalMedia';
import { downloadMediaToCache } from '@/net/media';
import { useTheme } from '@/theme/ThemeProvider';
import type { Message } from '@/types/models';

function isUri(value?: string): boolean {
  return !!value && value.includes('://');
}

export function MediaMessage({ message }: { message: Message }) {
  const theme = useTheme();
  const [uri, setUri] = useState<string | null>(isUri(message.mediaUrl) ? (message.mediaUrl ?? null) : null);

  useEffect(() => {
    let active = true;
    if (!uri && message.blob) {
      void downloadMediaToCache(message.blob)
        .then((u) => {
          if (active) setUri(u);
        })
        .catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, [uri, message.blob]);

  if (uri) {
    return (
      <Pressable accessibilityRole="imagebutton" accessibilityLabel="Photo" onPress={() => router.push({ pathname: '/media/[id]', params: { id: uri } })}>
        <Image source={{ uri }} style={{ width: 224, height: 224, borderRadius: theme.radius.md }} contentFit="cover" transition={120} />
      </Pressable>
    );
  }

  // Offline demo, or a placeholder while a received blob downloads.
  return <LocalMedia seed={message.mediaUrl ?? message.id} radius={theme.radius.md} style={{ width: 224, height: 224 }} />;
}
