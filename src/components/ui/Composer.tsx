// Message composer. Send is the one coral affordance (primary action). When empty, the mic
// takes its place. Grows with content up to a cap. Bottom inset keeps it above the home bar.

import { ArrowUp, Mic, Paperclip } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/typography';

export interface ComposerProps {
  onSend: (text: string) => void;
  onAttach?: () => void;
}

export function Composer({ onSend, onAttach }: ComposerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText('');
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: theme.space.sm,
        paddingHorizontal: theme.space.lg,
        paddingTop: theme.space.sm,
        paddingBottom: Math.max(theme.space.sm, insets.bottom),
        backgroundColor: theme.colors.base,
        borderTopWidth: 1,
        borderTopColor: theme.colors.hairline,
      }}>
      <IconButton accessibilityLabel="Add attachment" onPress={onAttach} size={40}>
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
          value={text}
          onChangeText={setText}
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
          accessibilityLabel="Send"
          onPress={submit}
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
        <IconButton accessibilityLabel="Record voice message" size={40}>
          <Icon icon={Mic} size={22} tone="secondary" />
        </IconButton>
      )}
    </View>
  );
}
