// The active call: a full-immersive screen that owns its own floor (no Screen chrome, no
// header). The encryption state is stated plainly under the name, a mono timer counts up,
// and the only high-emphasis control is the red End button. Coral is intentionally absent;
// on a live call the single point of attention is hanging up.

import { router, useLocalSearchParams } from 'expo-router';
import { Mic, MicOff, PhoneOff, ShieldCheck, Video, VideoOff, Volume2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { callDuration } from '@/lib/format';
import { usersById } from '@/lib/mockData';
import { useTheme } from '@/theme/ThemeProvider';

export default function CallScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const peerId = typeof id === 'string' ? id : '';
  const peer = usersById[peerId];
  const peerName = peer?.displayName ?? 'Unknown';

  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const controlSize = 64;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.base,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space.xl,
          paddingHorizontal: theme.space.xl,
        }}>
        <Avatar name={peerName} seed={peerId} size={128} />

        <View style={{ alignItems: 'center', gap: theme.space.sm }}>
          <Text variant="displayLg" center>
            {peerName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
            <Icon icon={ShieldCheck} tone="success" size={16} />
            <Text variant="footnote" tone="secondary">
              End-to-end encrypted
            </Text>
          </View>
          <Text variant="mono" tone="secondary">
            {callDuration(seconds)}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space.lg,
          paddingHorizontal: theme.space.xl,
          marginBottom: theme.space.xl,
        }}>
        <IconButton
          accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'}
          variant="surface"
          size={controlSize}
          onPress={() => setMuted((prev) => !prev)}>
          <Icon icon={muted ? MicOff : Mic} tone="ink" size={26} />
        </IconButton>

        <IconButton
          accessibilityLabel={videoOff ? 'Turn camera on' : 'Turn camera off'}
          variant="surface"
          size={controlSize}
          onPress={() => setVideoOff((prev) => !prev)}>
          <Icon icon={videoOff ? VideoOff : Video} tone="ink" size={26} />
        </IconButton>

        <IconButton
          accessibilityLabel={speakerOn ? 'Turn off speaker' : 'Turn on speaker'}
          variant="surface"
          size={controlSize}
          onPress={() => setSpeakerOn((prev) => !prev)}>
          <Icon icon={Volume2} tone={speakerOn ? 'accent' : 'ink'} size={26} />
        </IconButton>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="End call"
          hitSlop={theme.hitSlop}
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: controlSize,
            height: controlSize,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.danger,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}>
          <Icon icon={PhoneOff} tone="onAccent" size={26} />
        </Pressable>
      </View>
    </View>
  );
}
