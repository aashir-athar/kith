// Voice message content: play/pause toggle over a stylized waveform, plus duration. Playback is
// real: a sent clip plays from its local file, a received clip is downloaded and decrypted into the
// cache first. The player is created per message and released on unmount by the hook.

import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { callDuration } from '@/lib/format';
import { downloadMediaToCache } from '@/net/media';
import { useTheme } from '@/theme/ThemeProvider';
import type { Message } from '@/types/models';

function waveform(seed: string, count: number): number[] {
  const out: number[] = [];
  let h = 2166136261;
  for (let i = 0; i < count; i += 1) {
    h ^= seed.charCodeAt(i % Math.max(1, seed.length)) + i;
    h = (h * 16777619) >>> 0;
    out.push(0.28 + (h % 72) / 100);
  }
  return out;
}

function isUri(value?: string): boolean {
  return !!value && value.includes('://');
}

export function VoiceMessage({ message, mine }: { message: Message; mine: boolean }) {
  const theme = useTheme();
  const bars = waveform(message.id, 28);
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

  const player = useAudioPlayer(uri ? { uri } : undefined);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;

  const toggle = () => {
    if (!uri) return;
    if (playing) {
      player.pause();
    } else {
      if (status.didJustFinish || status.currentTime >= status.duration) player.seekTo(0);
      player.play();
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, minWidth: 180 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause voice message' : 'Play voice message'}
        onPress={toggle}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: mine ? theme.colors.accent : theme.colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: uri ? 1 : 0.6,
        }}>
        <Icon icon={playing ? Pause : Play} size={18} tone={mine ? 'onAccent' : 'ink'} />
      </Pressable>

      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 }}>
        {bars.map((value, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: `${Math.round(value * 100)}%`,
              borderRadius: 2,
              backgroundColor: theme.colors.inkSecondary,
              opacity: 0.7,
            }}
          />
        ))}
      </View>

      <Text variant="mono" tone="secondary">
        {callDuration(message.durationSec ?? 0)}
      </Text>
    </View>
  );
}
