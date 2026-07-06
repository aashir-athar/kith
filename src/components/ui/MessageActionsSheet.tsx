// Long-press message actions. Quick reactions across the top, then contextual actions.
// Edit/delete only for your own messages; translate offered on text (an on-device feature).

import {
  Copy,
  Forward,
  Languages,
  Pencil,
  Pin,
  Reply,
  Star,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import type { Message } from '@/types/models';

export type MessageAction = 'reply' | 'forward' | 'copy' | 'star' | 'pin' | 'edit' | 'delete' | 'translate';

const REACTIONS: { key: string; glyph: string }[] = [
  { key: 'thumbsup', glyph: 'Like' },
  { key: 'heart', glyph: 'Love' },
  { key: 'laugh', glyph: 'Haha' },
  { key: 'fire', glyph: 'Fire' },
];

export interface MessageActionsSheetProps {
  message: Message | null;
  mine: boolean;
  onClose: () => void;
  onAction: (action: MessageAction, message: Message) => void;
  onReact: (key: string, message: Message) => void;
}

export function MessageActionsSheet({ message, mine, onClose, onAction, onReact }: MessageActionsSheetProps) {
  const theme = useTheme();
  if (!message) return null;

  const rows: { action: MessageAction; label: string; icon: LucideIcon; danger?: boolean }[] = [
    { action: 'reply', label: 'Reply', icon: Reply },
    { action: 'forward', label: 'Forward', icon: Forward },
    ...(message.text ? [{ action: 'copy' as const, label: 'Copy', icon: Copy }] : []),
    ...(message.text ? [{ action: 'translate' as const, label: 'Translate', icon: Languages }] : []),
    { action: 'star', label: message.starred ? 'Unstar' : 'Star', icon: Star },
    { action: 'pin', label: message.pinned ? 'Unpin' : 'Pin', icon: Pin },
    ...(mine && message.kind === 'text' ? [{ action: 'edit' as const, label: 'Edit', icon: Pencil }] : []),
    ...(mine ? [{ action: 'delete' as const, label: 'Delete', icon: Trash2, danger: true }] : []),
  ];

  return (
    <Sheet visible={message !== null} onClose={onClose}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingHorizontal: theme.space.xl,
          paddingBottom: theme.space.md,
          marginBottom: theme.space.sm,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.hairline,
        }}>
        {REACTIONS.map((reaction) => (
          <Pressable
            key={reaction.key}
            accessibilityRole="button"
            accessibilityLabel={reaction.glyph}
            onPress={() => {
              onReact(reaction.key, message);
              onClose();
            }}
            style={({ pressed }) => ({
              width: 52,
              height: 52,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}>
            <Text variant="caption" tone="secondary">
              {reaction.glyph}
            </Text>
          </Pressable>
        ))}
      </View>

      {rows.map((row) => (
        <Pressable
          key={row.action}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          onPress={() => {
            onAction(row.action, message);
            onClose();
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.md,
            paddingHorizontal: theme.space.xl,
            height: 50,
            backgroundColor: pressed ? theme.colors.surface : 'transparent',
          })}>
          <Icon icon={row.icon} size={20} tone={row.danger ? 'danger' : 'secondary'} />
          <Text variant="body" tone={row.danger ? 'danger' : 'ink'}>
            {row.label}
          </Text>
        </Pressable>
      ))}
    </Sheet>
  );
}
