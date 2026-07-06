// Poll message content: question, tappable options with live result bars, and a vote count.

import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import type { Message } from '@/types/models';

export function PollMessage({ message }: { message: Message }) {
  const theme = useTheme();
  const poll = message.poll;
  const [voted, setVoted] = useState<string | undefined>(poll?.votedOptionId);
  if (!poll) return null;

  const addedVote = voted && !poll.votedOptionId ? 1 : 0;
  const total = Math.max(1, poll.totalVotes + addedVote);

  return (
    <View style={{ minWidth: 224, gap: theme.space.sm }}>
      <Text variant="bodyStrong">{poll.question}</Text>
      {poll.options.map((option) => {
        const votes = option.votes + (voted === option.id && poll.votedOptionId !== option.id ? 1 : 0);
        const pct = Math.round((votes / total) * 100);
        const selected = voted === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => setVoted(option.id)}
            style={{
              borderRadius: theme.radius.sm,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: selected ? theme.colors.accent : theme.colors.hairline,
            }}>
            <View
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: theme.colors.overlay }}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingHorizontal: theme.space.md,
                paddingVertical: theme.space.sm,
              }}>
              <Text variant="subhead" tone={selected ? 'accent' : 'ink'}>
                {option.label}
              </Text>
              <Text variant="caption" tone="secondary">
                {pct}%
              </Text>
            </View>
          </Pressable>
        );
      })}
      <Text variant="caption" tone="tertiary">
        {total} {total === 1 ? 'vote' : 'votes'}
      </Text>
    </View>
  );
}
