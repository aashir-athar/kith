// Chat info: identity, quick actions, encryption state, shared media, members (groups),
// per-chat settings, and safety controls. Reached from the conversation header.

import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Archive, Bell, ChevronRight, MessageCircle, Phone, Search, ShieldCheck, Video, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ListSectionLabel } from '@/components/ui/ListSectionLabel';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { conversationPeer, conversationTitle, me, usersById } from '@/lib/mockData';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { User } from '@/types/models';

export default function ChatInfoScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = typeof id === 'string' ? id : '';
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === cid));
  const messages = useChatStore((s) => s.messages[cid]) ?? [];
  const toggleArchive = useChatStore((s) => s.toggleArchive);
  const [muted, setMuted] = useState(conversation?.muted ?? false);

  if (!conversation) {
    return (
      <Screen edges={['top']}>
        <BackHeader title="Info" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text tone="secondary">Conversation not found</Text>
        </View>
      </Screen>
    );
  }

  const title = conversationTitle(conversation);
  const peer = conversationPeer(conversation);
  const isGroup = conversation.kind === 'group';
  const media = messages.filter((m) => m.kind === 'image');
  const members: User[] = conversation.participantIds
    .map((pid) => usersById[pid])
    .filter((u): u is User => !!u);

  const divider = (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline, marginLeft: theme.space.xl }} />
  );

  const quickAction = (label: string, icon: LucideIcon, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: 'center', gap: theme.space.xs }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon icon={icon} tone="accent" />
      </View>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Screen edges={['top']}>
      <BackHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.space['6xl'] }}>
        <View style={{ alignItems: 'center', gap: theme.space.sm, paddingHorizontal: theme.space.xl }}>
          <Avatar name={title} seed={cid} url={peer?.avatarUrl} size={96} />
          <Text variant="displayLg" center numberOfLines={1}>
            {title}
          </Text>
          {peer ? (
            <Text variant="callout" tone="secondary">
              @{peer.username}
            </Text>
          ) : (
            <Text variant="callout" tone="secondary">
              {members.length} members
            </Text>
          )}
          {peer?.bio ? (
            <Text variant="body" tone="secondary" center>
              {peer.bio}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.space.xl, paddingVertical: theme.space.xl }}>
          {quickAction('Message', MessageCircle, () => router.back())}
          {quickAction('Call', Phone, () => router.push({ pathname: '/call/[id]', params: { id: peer?.id ?? cid } }))}
          {quickAction('Video', Video, () => router.push({ pathname: '/call/[id]', params: { id: peer?.id ?? cid } }))}
          {quickAction('Search', Search, () => router.push('/search'))}
        </View>

        <View style={{ paddingHorizontal: theme.space.xl }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Verify safety number"
            onPress={() => router.push({ pathname: '/verify/[id]', params: { id: cid } })}>
            <Surface variant="flat" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, padding: theme.space.lg }}>
              <Icon icon={ShieldCheck} tone="success" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">End-to-end encrypted</Text>
                <Text variant="footnote" tone="secondary">
                  Tap to verify the safety number with {peer?.displayName ?? title}.
                </Text>
              </View>
              <Icon icon={ChevronRight} size={18} tone="tertiary" />
            </Surface>
          </Pressable>
        </View>

        {media.length > 0 ? (
          <>
            <ListSectionLabel label="Shared media" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: theme.space.xl, gap: theme.space.sm }}>
              {media.map((m) => {
                const seed = m.mediaUrl ?? m.id;
                return (
                  <Pressable
                    key={m.id}
                    accessibilityRole="imagebutton"
                    accessibilityLabel="Shared photo"
                    onPress={() => router.push({ pathname: '/media/[id]', params: { id: seed } })}>
                    <Image
                      source={{ uri: `https://picsum.photos/seed/${seed}/200/200` }}
                      style={{ width: 88, height: 88, borderRadius: theme.radius.sm }}
                      contentFit="cover"
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {isGroup ? (
          <>
            <ListSectionLabel label={`${members.length} members`} />
            <Surface variant="flat" style={{ marginHorizontal: theme.space.xl, overflow: 'hidden' }}>
              {members.map((member, index) => (
                <View key={member.id}>
                  {index > 0 ? divider : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingHorizontal: theme.space.lg, paddingVertical: theme.space.sm }}>
                    <Avatar name={member.displayName} seed={member.id} url={member.avatarUrl} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {member.id === me.id ? 'You' : member.displayName}
                      </Text>
                      <Text variant="footnote" tone="secondary">
                        @{member.username}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Surface>
          </>
        ) : null}

        <ListSectionLabel label="Settings" />
        <Surface variant="flat" style={{ marginHorizontal: theme.space.xl, overflow: 'hidden' }}>
          <SettingsRow
            label="Mute notifications"
            icon={Bell}
            onPress={() => setMuted((v) => !v)}
            right={
              <Switch
                value={muted}
                onValueChange={setMuted}
                trackColor={{ true: theme.colors.accent, false: theme.colors.overlay }}
                thumbColor={theme.colors.ink}
                ios_backgroundColor={theme.colors.overlay}
              />
            }
          />
          {divider}
          <SettingsRow label="Disappearing messages" value="Off" />
          {divider}
          <SettingsRow
            label={conversation.archived ? 'Unarchive chat' : 'Archive chat'}
            icon={Archive}
            onPress={() => {
              toggleArchive(cid);
              router.back();
            }}
          />
        </Surface>

        <ListSectionLabel label="Safety" />
        <Surface variant="flat" style={{ marginHorizontal: theme.space.xl, overflow: 'hidden' }}>
          <SettingsRow
            label={`Block ${peer?.displayName ?? title}`}
            danger
            onPress={() =>
              Alert.alert('Block', `Block ${title}? They will not be able to message or call you.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Block', style: 'destructive', onPress: () => undefined },
              ])
            }
          />
          {divider}
          <SettingsRow
            label="Report"
            danger
            onPress={() =>
              Alert.alert('Report', 'Reported content is verified with cryptographic provenance, without exposing the rest of your chat.')
            }
          />
        </Surface>
      </ScrollView>
    </Screen>
  );
}
