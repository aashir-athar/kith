// Sticker and GIF picker. Emoji input comes from the system keyboard (so our own UI stays
// emoji-free); this panel covers the image-based stickers and GIFs.

import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { LocalMedia } from '@/components/ui/LocalMedia';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

const STICKERS = Array.from({ length: 12 }, (_, i) => `kith-sticker-${i}`);
const GIFS = Array.from({ length: 9 }, (_, i) => `kith-gif-${i}`);

export interface StickerPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function StickerPicker({ visible, onClose, onSelect }: StickerPickerProps) {
  const theme = useTheme();
  const [tab, setTab] = useState<'stickers' | 'gifs'>('stickers');
  const items = tab === 'stickers' ? STICKERS : GIFS;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', gap: theme.space.xl, paddingHorizontal: theme.space.xl, paddingBottom: theme.space.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Stickers" onPress={() => setTab('stickers')}>
          <Text variant="subhead" tone={tab === 'stickers' ? 'accent' : 'secondary'}>
            Stickers
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="GIFs" onPress={() => setTab('gifs')}>
          <Text variant="subhead" tone={tab === 'gifs' ? 'accent' : 'secondary'}>
            GIFs
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ maxHeight: 320 }}
        contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.space.lg, gap: theme.space.sm }}>
        {items.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={tab === 'stickers' ? 'Sticker' : 'GIF'}
            onPress={() => {
              onSelect(id);
              onClose();
            }}
            style={{ width: '30%', aspectRatio: 1 }}>
            <LocalMedia seed={id} radius={theme.radius.md} style={{ width: '100%', height: '100%' }} />
          </Pressable>
        ))}
      </ScrollView>
    </Sheet>
  );
}
