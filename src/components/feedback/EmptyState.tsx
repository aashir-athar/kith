// Encouraging empty state. Copy takes the burden off the user and points to the next action.
// Real UI, never a "coming soon" placeholder.

import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export interface EmptyStateProps {
  title: string;
  body?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, body, icon, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.space['4xl'],
        gap: theme.space.md,
      }}>
      {icon}
      <Text variant="title" center>
        {title}
      </Text>
      {body ? (
        <Text variant="callout" tone="secondary" center>
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: theme.space.lg }}>{action}</View> : null}
    </View>
  );
}
