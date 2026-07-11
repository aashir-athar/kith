// Create a community. Names a room, adds members (each channel is a group conversation), and drops
// you into it. In a live build members come from your contacts; the offline demo creates a local room.

import { router } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { conversationPeer, users } from '@/lib/mockData';
import { BACKEND_ENABLED } from '@/net/config';
import { useChatStore } from '@/stores/useChatStore';
import { useCommunityStore } from '@/stores/useCommunityStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/typography';
import type { User } from '@/types/models';

export default function NewCommunityScreen() {
  const theme = useTheme();
  const createCommunity = useCommunityStore((s) => s.createCommunity);
  const conversations = useChatStore((s) => s.conversations);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const contacts: readonly User[] = BACKEND_ENABLED
    ? Array.from(
        new Map(
          conversations
            .filter((c) => c.kind === 'direct')
            .map((c) => conversationPeer(c))
            .filter((u): u is User => !!u)
            .map((u) => [u.id, u]),
        ).values(),
      )
    : users;

  const valid = name.trim().length >= 2 && (!BACKEND_ENABLED || selected.length > 0) && !busy;
  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const create = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const community = await createCommunity(name, description, selected);
      router.replace('/community/' + community.id);
    } catch {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm }}>
        <Text variant="headline">New community</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={theme.hitSlop} onPress={() => router.back()}>
          <Icon icon={X} tone="secondary" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space['4xl'], gap: theme.space.lg }} keyboardShouldPersistTaps="handled">
        <Text variant="body" tone="secondary">
          Start an invite-only room. Every message stays encrypted between members, even in a crowd.
        </Text>

        <View style={{ gap: theme.space.xs }}>
          <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Name
          </Text>
          <Surface variant="flat" style={{ paddingHorizontal: theme.space.lg, minHeight: 56, justifyContent: 'center' }}>
            <TextInput value={name} onChangeText={setName} placeholder="Frontline Press" placeholderTextColor={theme.colors.inkTertiary} autoFocus style={{ color: theme.colors.ink, fontFamily: fontFamily.body, fontSize: 17 }} />
          </Surface>
        </View>

        <View style={{ gap: theme.space.xs }}>
          <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Description
          </Text>
          <Surface variant="flat" style={{ paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md, minHeight: 56 }}>
            <TextInput value={description} onChangeText={setDescription} placeholder="What is this room for?" placeholderTextColor={theme.colors.inkTertiary} multiline style={{ color: theme.colors.ink, fontFamily: fontFamily.body, fontSize: 17, minHeight: 56 }} />
          </Surface>
        </View>

        <View>
          <ListSectionLabel label={selected.length > 0 ? `${selected.length} selected` : 'Members'} />
          {contacts.length === 0 ? (
            <Text variant="footnote" tone="tertiary">
              Start a direct chat with someone first, then you can add them to a community.
            </Text>
          ) : null}
          {contacts.map((user) => {
            const on = selected.includes(user.id);
            return (
              <Pressable
                key={user.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={user.displayName}
                onPress={() => toggle(user.id)}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingVertical: theme.space.sm, backgroundColor: pressed ? theme.colors.surface : 'transparent' })}>
                <Avatar name={user.displayName} seed={user.id} url={user.avatarUrl} size={40} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {user.displayName}
                  </Text>
                  <Text variant="footnote" tone="secondary">
                    @{user.username}
                  </Text>
                </View>
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? theme.colors.accent : theme.colors.hairline, backgroundColor: on ? theme.colors.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <Icon icon={Check} size={14} tone="onAccent" strokeWidth={3} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Button label={busy ? 'Creating' : 'Create community'} variant="primary" fullWidth disabled={!valid} onPress={create} />
      </ScrollView>
    </Screen>
  );
}
