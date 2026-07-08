// How Kith protects you. Backs the privacy claims with a plain explanation instead of an
// unlinked superlative: how encryption works, how recovery works, and how a room can be both
// encrypted and moderated. Linked from Welcome, Recovery, and Communities.

import { router } from 'expo-router';
import { KeyRound, Lock, Users, X } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

const SECTIONS = [
  {
    icon: Lock,
    title: 'How encryption works',
    body: 'Every message is encrypted on your device before it leaves, and our servers relay ciphertext they cannot read. There is no phone number tying the account to you, and no backdoor key.',
  },
  {
    icon: KeyRound,
    title: 'How recovery works',
    body: 'Your account is a twelve-word recovery phrase that only you hold. It is generated on your device and never leaves it. Enter it on a new phone to sign back in as you. Lose it and no one, us included, can restore your account. That is the trade-off real privacy asks for.',
  },
  {
    icon: Users,
    title: 'How moderation works',
    body: 'A community can be encrypted and still moderated, because moderation happens on the client, not the server. Members report content from their own device, which decrypts locally and attaches cryptographic provenance. Admins act on reports and metadata; the server never reads the messages.',
  },
];

export default function SecurityExplainer() {
  const theme = useTheme();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm }}>
        <Text variant="headline">How Kith protects you</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={theme.hitSlop} onPress={() => router.back()}>
          <Icon icon={X} tone="secondary" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space['4xl'], gap: theme.space.md }}>
        {SECTIONS.map((s) => (
          <Surface key={s.title} variant="flat" style={{ padding: theme.space.lg, gap: theme.space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
              <Icon icon={s.icon} tone="accent" />
              <Text variant="bodyStrong">{s.title}</Text>
            </View>
            <Text variant="body" tone="secondary">
              {s.body}
            </Text>
          </Surface>
        ))}
      </ScrollView>
    </Screen>
  );
}
