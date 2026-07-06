// Storage dashboard. Auto-download is off by default; this shows what each chat is using and
// offers a reclaim. Sizes are derived from message kinds (mock).

import { Alert, ScrollView, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { Text } from '@/components/ui/Text';
import { conversationTitle } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';

function sizeOf(kind: string): number {
  if (kind === 'image') return 1.8;
  if (kind === 'voice') return 0.4;
  if (kind === 'document') return 2.4;
  return 0.02;
}

export default function StorageScreen() {
  const theme = useTheme();
  const conversations = useChatStore((s) => s.conversations);
  const messages = useChatStore((s) => s.messages);

  const sizes = conversations
    .map((conversation) => {
      const list = messages[conversation.id] ?? [];
      const mb = list.reduce((sum, m) => sum + sizeOf(m.kind), 0.1);
      return { conversation, mb };
    })
    .sort((a, b) => b.mb - a.mb);
  const total = sizes.reduce((sum, item) => sum + item.mb, 0);
  const max = Math.max(1, sizes[0]?.mb ?? 1);

  return (
    <Screen edges={['top']}>
      <BackHeader title="Storage" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space['6xl'] }}>
        <View style={{ paddingHorizontal: theme.space.xl, paddingTop: theme.space.md, gap: theme.space.md }}>
          <Text variant="displayLg">{total.toFixed(1)} MB</Text>
          <Text variant="body" tone="secondary">
            Auto-download is off by default, so you decide what lands on your phone.
          </Text>
          <Button
            label="Reclaim space"
            variant="secondary"
            onPress={() => Alert.alert('Reclaim space', 'Cached media older than 30 days would be cleared. Your messages stay.')}
          />
        </View>

        <ListSectionLabel label="By chat" />
        <View style={{ paddingHorizontal: theme.space.xl, gap: theme.space.md }}>
          {sizes.map(({ conversation, mb }) => (
            <View key={conversation.id} style={{ gap: theme.space.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="subhead" numberOfLines={1} style={{ flex: 1 }}>
                  {conversationTitle(conversation)}
                </Text>
                <Text variant="caption" tone="secondary">
                  {mb.toFixed(1)} MB
                </Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.surface, overflow: 'hidden' }}>
                <View style={{ height: 6, width: `${Math.round((mb / max) * 100)}%`, backgroundColor: theme.colors.accent }} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
