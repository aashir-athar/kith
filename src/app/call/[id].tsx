// Active call. Branches on call kind: a real video layout (remote fill + self PiP) for video,
// the avatar layout for audio. A connecting state precedes the timer, so it never claims
// "connected" before it could be. Coral is intentionally absent; the one focus is hanging up.

import { router, useLocalSearchParams } from 'expo-router';
import { Mic, MicOff, PhoneOff, ShieldAlert, ShieldCheck, Video, VideoOff, Volume2 } from 'lucide-react-native';
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
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const peerId = typeof id === 'string' ? id : '';
  const peer = usersById[peerId];
  const peerName = peer?.displayName ?? 'Unknown';
  const verified = peer?.verified ?? false;
  const isVideo = kind === 'video';

  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(!isVideo);
  const [speakerOn, setSpeakerOn] = useState(isVideo);

  useEffect(() => {
    const connectTimer = setTimeout(() => setConnected(true), 1500);
    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [connected]);

  const controlSize = 64;
  const showVideo = isVideo && !videoOff;
  const statusLine = connected ? callDuration(seconds) : 'Connecting';

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.base, paddingTop: showVideo ? 0 : insets.top, paddingBottom: insets.bottom }}>
      {showVideo ? (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', gap: theme.space.sm }}>
            <Icon icon={Video} size={40} tone="tertiary" />
            <Text variant="footnote" tone="tertiary">
              {peerName}
            </Text>
          </View>
          <View
            style={{
              position: 'absolute',
              right: theme.space.lg,
              top: insets.top + theme.space.lg,
              width: 100,
              height: 148,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.elevated,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
            <Text variant="caption" tone="tertiary">
              You
            </Text>
          </View>
          <View style={{ position: 'absolute', top: insets.top + theme.space.lg, left: theme.space.xl, gap: 2 }}>
            <Text variant="headline" style={{ color: '#FFFFFF' }}>
              {peerName}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Verify safety number"
              onPress={() => router.push({ pathname: '/verify/[id]', params: { id: peerId } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xxs }}>
              <Icon icon={verified ? ShieldCheck : ShieldAlert} size={14} tone={verified ? 'success' : 'warning'} />
              <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {verified ? 'Encrypted' : 'Tap to verify'} · {statusLine}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.xl, paddingHorizontal: theme.space.xl }}>
          <Avatar name={peerName} seed={peerId} size={128} />
          <View style={{ alignItems: 'center', gap: theme.space.sm }}>
            <Text variant="displayLg" center>
              {peerName}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Verify safety number"
              onPress={() => router.push({ pathname: '/verify/[id]', params: { id: peerId } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
              <Icon icon={verified ? ShieldCheck : ShieldAlert} tone={verified ? 'success' : 'warning'} size={16} />
              <Text variant="footnote" tone="accent">
                {verified ? 'End-to-end encrypted · verify' : 'Encrypted · tap to verify'}
              </Text>
            </Pressable>
            <Text variant="mono" tone="secondary">
              {statusLine}
            </Text>
          </View>
        </View>
      )}

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
