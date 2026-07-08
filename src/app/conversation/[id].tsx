// Conversation thread. Wires the full message surface: long-press actions (reply, forward,
// copy, star, pin, edit, delete, translate), reactions, attachments, voice, reply and edit
// compose states. Both bubble sides stay neutral; coral is only the send affordance.

import { FlashList } from '@shopify/flash-list';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, Video } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { AttachmentSheet, type AttachmentKind } from '@/components/ui/AttachmentSheet';
import { Avatar } from '@/components/ui/Avatar';
import { CatchUpCard } from '@/components/ui/CatchUpCard';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { Composer } from '@/components/ui/Composer';
import { ForwardSheet } from '@/components/ui/ForwardSheet';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { MessageActionsSheet, type MessageAction } from '@/components/ui/MessageActionsSheet';
import { StickerPicker } from '@/components/ui/StickerPicker';
import { Text } from '@/components/ui/Text';
import { avatarGradient } from '@/lib/avatar';
import { dayLabel } from '@/lib/format';
import { newId } from '@/lib/id';
import { conversationPeer, conversationTitle, me, usersById } from '@/lib/mockData';
import { BACKEND_ENABLED } from '@/net/config';
import { useChatStore } from '@/stores/useChatStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Message } from '@/types/models';

type ThreadRow = { type: 'day'; label: string } | { type: 'msg'; message: Message; firstOfRun: boolean };

const KIND_PREVIEW: Record<string, string> = {
  image: 'Photo',
  voice: 'Voice message',
  document: 'Document',
  location: 'Location',
  contact: 'Contact',
  poll: 'Poll',
  sticker: 'Sticker',
};

function previewText(message: Message): string {
  return message.text ?? KIND_PREVIEW[message.kind] ?? '';
}

function authorName(message: Message): string {
  if (message.senderId === me.id) return 'You';
  return usersById[message.senderId]?.displayName ?? 'Unknown';
}

export default function ConversationScreen() {
  const theme = useTheme();
  const { id, channel, members } = useLocalSearchParams<{ id: string; channel?: string; members?: string }>();
  const isChannel = channel === '1';
  const cid = typeof id === 'string' ? id : '';

  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === cid));
  const messages = useChatStore((s) => s.messages[cid]) ?? [];
  const sendText = useChatStore((s) => s.sendText);
  const sendImage = useChatStore((s) => s.sendImage);
  const sendDocument = useChatStore((s) => s.sendDocument);
  const sendVoice = useChatStore((s) => s.sendVoice);
  const sendSticker = useChatStore((s) => s.sendSticker);
  const sendLocation = useChatStore((s) => s.sendLocation);
  const sendContact = useChatStore((s) => s.sendContact);
  const sendPoll = useChatStore((s) => s.sendPoll);
  const addReaction = useChatStore((s) => s.addReaction);
  const toggleStar = useChatStore((s) => s.toggleStar);
  const togglePinMessage = useChatStore((s) => s.togglePinMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const retryMessage = useChatStore((s) => s.retryMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const forwardMessage = useChatStore((s) => s.forwardMessage);
  const markRead = useChatStore((s) => s.markRead);
  const hydrateHistory = useChatStore((s) => s.hydrateHistory);

  const [text, setText] = useState('');
  const [selected, setSelected] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ messageId: string; author: string; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [attachVisible, setAttachVisible] = useState(false);
  const [forwardId, setForwardId] = useState<string | null>(null);
  const [catchUpDismissed, setCatchUpDismissed] = useState(false);
  const [stickerVisible, setStickerVisible] = useState(false);

  const title = conversation ? conversationTitle(conversation) : 'Conversation';
  const callTargetId = conversation ? (conversationPeer(conversation)?.id ?? cid) : cid;
  // Only text is wired to the real encrypted transport. Media, voice, and calls are shown in the
  // offline demo but are honestly absent in a live build rather than faking delivery.
  const liveFeatures = !BACKEND_ENABLED;

  const rows: ThreadRow[] = [];
  let lastDay = '';
  let prevSender = '';
  for (const m of messages) {
    const day = dayLabel(m.createdAt);
    if (day !== lastDay) {
      rows.push({ type: 'day', label: day });
      lastDay = day;
      prevSender = '';
    }
    rows.push({ type: 'msg', message: m, firstOfRun: m.senderId !== prevSender });
    prevSender = m.senderId;
  }

  const incoming = messages.filter((m) => m.senderId !== me.id);
  const lastIncoming = incoming[incoming.length - 1];
  const showCatchUp = !catchUpDismissed && incoming.length >= 3;
  const catchUpSummary = lastIncoming?.text
    ? `${incoming.length} messages while you were away. Most recent: "${lastIncoming.text}"`
    : `${incoming.length} messages while you were away, including media and updates.`;

  useEffect(() => {
    if (!cid) return;
    void hydrateHistory(cid);
    markRead(cid);
  }, [cid, markRead, hydrateHistory]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (editingId) {
      editMessage(cid, editingId, trimmed);
      setEditingId(null);
    } else {
      sendText(cid, trimmed, replyingTo ? { replyToId: replyingTo.messageId } : undefined);
    }
    setText('');
    setReplyingTo(null);
  };

  const handleAction = (action: MessageAction, message: Message) => {
    switch (action) {
      case 'reply':
        setReplyingTo({ messageId: message.id, author: authorName(message), text: previewText(message) });
        break;
      case 'forward':
        setForwardId(message.id);
        break;
      case 'copy':
        void Clipboard.setStringAsync(message.text ?? '');
        break;
      case 'star':
        toggleStar(cid, message.id);
        break;
      case 'pin':
        togglePinMessage(cid, message.id);
        break;
      case 'edit':
        setEditingId(message.id);
        setText(message.text ?? '');
        break;
      case 'delete':
        deleteMessage(cid, message.id);
        break;
      case 'translate':
        Alert.alert('Translated on device', 'Kith translates messages locally. Your text never leaves your phone.');
        break;
    }
  };

  const handleAttach = (kind: AttachmentKind) => {
    switch (kind) {
      case 'photo':
      case 'camera':
        sendImage(cid, newId());
        break;
      case 'document':
        sendDocument(cid, 'Field-brief.pdf', '1.8 MB');
        break;
      case 'location':
        sendLocation(cid, 'Current location');
        break;
      case 'contact':
        sendContact(cid, 'Imani Okafor', 'imani');
        break;
      case 'poll':
        sendPoll(cid, 'Quick poll', ['Yes', 'No', 'Maybe']);
        break;
    }
  };

  return (
    <Screen edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
          paddingHorizontal: theme.space.lg,
          paddingTop: theme.space.sm,
          paddingBottom: theme.space.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.hairline,
        }}>
        <IconButton accessibilityLabel="Back" onPress={() => router.back()}>
          <Icon icon={ArrowLeft} tone="ink" />
        </IconButton>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Conversation info"
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id: cid } })}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
          <Avatar size={36} name={title} seed={callTargetId} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {title}
            </Text>
            <Text variant="caption" tone="secondary">
              {isChannel
                ? `${members ? members + ' members · ' : ''}encrypted for the room`
                : conversation?.verified
                  ? 'verified · end-to-end encrypted'
                  : 'end-to-end encrypted'}
            </Text>
          </View>
        </Pressable>

        {!isChannel && liveFeatures ? (
          <>
            <IconButton
              accessibilityLabel="Start video call"
              onPress={() => router.push({ pathname: '/call/[id]', params: { id: callTargetId, kind: 'video' } })}>
              <Icon icon={Video} tone="secondary" />
            </IconButton>
            <IconButton
              accessibilityLabel="Start voice call"
              onPress={() => router.push({ pathname: '/call/[id]', params: { id: callTargetId, kind: 'audio' } })}>
              <Icon icon={Phone} tone="secondary" />
            </IconButton>
          </>
        ) : null}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.space['4xl'] }}>
              <Text variant="callout" tone="tertiary" center>
                No messages yet. Say hello.
              </Text>
            </View>
          ) : (
            <FlashList
              data={rows}
              keyExtractor={(item) => (item.type === 'day' ? `d:${item.label}` : item.message.id)}
              getItemType={(item) => item.type}
              renderItem={({ item }) => {
                if (item.type === 'day') {
                  return (
                    <View style={{ alignItems: 'center', paddingVertical: theme.space.sm }}>
                      <View
                        style={{
                          backgroundColor: theme.colors.surface,
                          borderRadius: theme.radius.pill,
                          paddingHorizontal: theme.space.md,
                          paddingVertical: 4,
                        }}>
                        <Text variant="caption" tone="secondary">
                          {item.label}
                        </Text>
                      </View>
                    </View>
                  );
                }
                const message = item.message;
                const mine = message.senderId === me.id;
                const replied = message.replyToId ? messages.find((m) => m.id === message.replyToId) : undefined;
                const replyPreview = replied ? { author: authorName(replied), text: previewText(replied) } : undefined;
                const sender = usersById[message.senderId];
                const author =
                  conversation?.kind === 'group' && !mine && item.firstOfRun && sender
                    ? { name: sender.displayName, color: avatarGradient(sender.id)[0] }
                    : undefined;
                return (
                  <Pressable onLongPress={() => setSelected(message)} delayLongPress={220}>
                    <ChatBubble
                      message={message}
                      mine={mine}
                      replyPreview={replyPreview}
                      author={author}
                      onRetry={() => retryMessage(cid, message.id)}
                    />
                  </Pressable>
                );
              }}
              contentContainerStyle={{ paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md }}
              ListHeaderComponent={
                showCatchUp ? <CatchUpCard summary={catchUpSummary} onDismiss={() => setCatchUpDismissed(true)} /> : null
              }
              maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
            />
          )}
        </View>

        <Composer
          value={text}
          onChangeText={setText}
          onSend={handleSend}
          onAttachPress={liveFeatures ? () => setAttachVisible(true) : undefined}
          onStickerPress={liveFeatures ? () => setStickerVisible(true) : undefined}
          onVoice={liveFeatures ? (sec) => sendVoice(cid, sec) : undefined}
          replyingTo={replyingTo ? { author: replyingTo.author, text: replyingTo.text } : undefined}
          onCancelReply={() => setReplyingTo(null)}
          editing={editingId !== null}
          onCancelEdit={() => {
            setEditingId(null);
            setText('');
          }}
        />
      </KeyboardAvoidingView>

      <MessageActionsSheet
        message={selected}
        mine={selected?.senderId === me.id}
        onClose={() => setSelected(null)}
        onAction={handleAction}
        onReact={(key, message) => addReaction(cid, message.id, key)}
      />
      <AttachmentSheet visible={attachVisible} onClose={() => setAttachVisible(false)} onSelect={handleAttach} />
      <StickerPicker visible={stickerVisible} onClose={() => setStickerVisible(false)} onSelect={(id) => sendSticker(cid, id)} />
      <ForwardSheet
        visible={forwardId !== null}
        onClose={() => setForwardId(null)}
        onSelect={(toId) => {
          if (forwardId) forwardMessage(cid, forwardId, toId);
        }}
      />
    </Screen>
  );
}
