// Image message content. Local generated media (no third-party fetch). Taps open the viewer.

import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { LocalMedia } from '@/components/ui/LocalMedia';
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
      <LocalMedia seed={seed} radius={theme.radius.md} style={{ width: 224, height: 224 }} />
    </Pressable>
  );
}
