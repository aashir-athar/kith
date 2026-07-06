// Image message content. Taps open the full-screen viewer.

import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { Message } from '@/types/models';

export function MediaMessage({ message }: { message: Message }) {
  const theme = useTheme();
  const seed = message.mediaUrl ?? message.id;
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="Photo"
      onPress={() => router.push({ pathname: '/media/[id]', params: { id: seed } })}>
      <Image
        source={{ uri: `https://picsum.photos/seed/${seed}/600/600` }}
        style={{ width: 224, height: 224, borderRadius: theme.radius.md }}
        contentFit="cover"
        transition={120}
      />
    </Pressable>
  );
}
