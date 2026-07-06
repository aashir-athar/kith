// Safety number / verification. Compare the number or scan the code to confirm no one is in
// the middle. Marking verified shows a badge and alerts on any future key change.

import { useLocalSearchParams } from 'expo-router';
import { QrCode, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { conversationTitle } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';

function safetyGroups(seed: string): string[] {
  let h = 2166136261;
  const groups: string[] = [];
  for (let g = 0; g < 12; g += 1) {
    let value = '';
    for (let i = 0; i < 5; i += 1) {
      h ^= seed.charCodeAt((g * 5 + i) % Math.max(1, seed.length)) + g + i;
      h = (h * 16777619) >>> 0;
      value += String(h % 10);
    }
    groups.push(value);
  }
  return groups;
}

export default function VerifyScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = typeof id === 'string' ? id : '';
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === cid));
  const title = conversation ? conversationTitle(conversation) : 'this chat';
  const [verified, setVerified] = useState(false);
  const groups = safetyGroups(`${cid}::kith`);

  return (
    <Screen edges={['top']}>
      <BackHeader title="Safety number" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space['6xl'], gap: theme.space.xl }}>
        <View style={{ alignItems: 'center', gap: theme.space.md, paddingTop: theme.space.md }}>
          <View
            style={{
              width: 160,
              height: 160,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon icon={QrCode} size={96} tone="ink" />
          </View>
          <Text variant="body" tone="secondary" center>
            Scan this code on {title}&apos;s phone, or compare the numbers below, to confirm your conversation is private.
          </Text>
        </View>

        <Surface variant="flat" style={{ padding: theme.space.lg }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.space.sm }}>
            {groups.map((group, index) => (
              <Text key={index} variant="mono" style={{ width: '33.33%', textAlign: 'center' }}>
                {group}
              </Text>
            ))}
          </View>
        </Surface>

        <Surface variant="flat" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, padding: theme.space.lg }}>
          <Icon icon={ShieldCheck} tone={verified ? 'success' : 'secondary'} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Mark as verified</Text>
            <Text variant="footnote" tone="secondary">
              Verified contacts show a badge, and you are alerted if their key ever changes.
            </Text>
          </View>
          <Switch
            value={verified}
            onValueChange={setVerified}
            trackColor={{ true: theme.colors.accent, false: theme.colors.overlay }}
            thumbColor={theme.colors.ink}
            ios_backgroundColor={theme.colors.overlay}
          />
        </Surface>
      </ScrollView>
    </Screen>
  );
}
