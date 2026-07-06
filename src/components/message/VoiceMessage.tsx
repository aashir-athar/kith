// Voice message content: play toggle, a deterministic waveform, and duration. Playback is
// mocked here; the real audio layer wires into the same play state.

import { Pause, Play } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { callDuration } from '@/lib/format';
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

export function VoiceMessage({ message, mine }: { message: Message; mine: boolean }) {
  const theme = useTheme();
  const [playing, setPlaying] = useState(false);
  const bars = waveform(message.id, 28);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, minWidth: 180 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause voice message' : 'Play voice message'}
        onPress={() => setPlaying((p) => !p)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: mine ? theme.colors.accent : theme.colors.overlay,
          alignItems: 'center',
          justifyContent: 'center',
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
