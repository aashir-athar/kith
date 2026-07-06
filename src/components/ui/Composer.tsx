// Message composer (controlled). Supports reply and edit context bars, attachments, and a
// voice recording mode. Send is the one coral affordance; the mic takes its place when empty.

import { ArrowUp, Mic, Paperclip, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { callDuration } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/typography';

export interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachPress?: () => void;
  onVoice?: (durationSec: number) => void;
  replyingTo?: { author: string; text: string };
  onCancelReply?: () => void;
  editing?: boolean;
  onCancelEdit?: () => void;
}

export function Composer({
  value,
  onChangeText,
  onSend,
  onAttachPress,
  onVoice,
  replyingTo,
  onCancelReply,
  editing = false,
  onCancelEdit,
}: ComposerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const canSend = value.trim().length > 0;

  useEffect(() => {
    if (!recording) return;
    setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const context = editing
    ? { label: 'Editing message', body: value, onCancel: onCancelEdit }
    : replyingTo
      ? { label: `Reply to ${replyingTo.author}`, body: replyingTo.text, onCancel: onCancelReply }
      : null;

  return (
    <View style={{ backgroundColor: theme.colors.base, borderTopWidth: 1, borderTopColor: theme.colors.hairline }}>
      {context ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.sm,
            paddingHorizontal: theme.space.lg,
            paddingTop: theme.space.sm,
          }}>
          <View style={{ flex: 1, borderLeftWidth: 2, borderLeftColor: theme.colors.accent, paddingLeft: theme.space.sm }}>
            <Text variant="caption" tone="accent">
              {context.label}
            </Text>
            <Text variant="footnote" tone="secondary" numberOfLines={1}>
              {context.body}
            </Text>
          </View>
          <IconButton accessibilityLabel="Cancel" size={32} onPress={context.onCancel}>
            <Icon icon={X} size={18} tone="secondary" />
          </IconButton>
        </View>
      ) : null}

      {recording ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.md,
            paddingHorizontal: theme.space.lg,
            paddingTop: theme.space.sm,
            paddingBottom: Math.max(theme.space.sm, insets.bottom),
          }}>
          <IconButton
            accessibilityLabel="Cancel recording"
            size={40}
            onPress={() => setRecording(false)}>
            <Icon icon={Trash2} size={22} tone="danger" />
          </IconButton>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.danger }} />
            <Text variant="callout" tone="secondary">
              Recording
            </Text>
            <Text variant="mono" tone="secondary">
              {callDuration(seconds)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send voice message"
            onPress={() => {
              onVoice?.(Math.max(1, seconds));
              setRecording(false);
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon icon={ArrowUp} size={22} tone="onAccent" strokeWidth={2.6} />
          </Pressable>
        </View>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: theme.space.sm,
            paddingHorizontal: theme.space.lg,
            paddingTop: theme.space.sm,
            paddingBottom: Math.max(theme.space.sm, insets.bottom),
          }}>
          <IconButton accessibilityLabel="Add attachment" onPress={onAttachPress} size={40}>
            <Icon icon={Paperclip} size={22} tone="secondary" />
          </IconButton>

          <View
            style={{
              flex: 1,
              backgroundColor: theme.colors.elevated,
              borderRadius: theme.radius.xl,
              paddingHorizontal: theme.space.lg,
              paddingVertical: theme.space.sm,
              minHeight: 40,
              justifyContent: 'center',
            }}>
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder="Message"
              placeholderTextColor={theme.colors.inkTertiary}
              multiline
              style={{
                color: theme.colors.ink,
                fontFamily: fontFamily.body,
                fontSize: 16,
                maxHeight: 120,
                paddingTop: 0,
                paddingBottom: 0,
              }}
            />
          </View>

          {canSend ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={editing ? 'Save edit' : 'Send'}
              onPress={onSend}
              style={{
                width: 40,
                height: 40,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon icon={ArrowUp} size={22} tone="onAccent" strokeWidth={2.6} />
            </Pressable>
          ) : (
            <IconButton accessibilityLabel="Record voice message" size={40} onPress={() => setRecording(true)}>
              <Icon icon={Mic} size={22} tone="secondary" />
            </IconButton>
          )}
        </View>
      )}
    </View>
  );
}
