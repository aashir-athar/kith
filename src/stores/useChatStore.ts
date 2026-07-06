// Local-first chat state. Optimistic send for every message kind, plus the full set of
// message actions (react, star, pin, edit, delete, forward, reply). The mock transport
// advances sending -> sent -> delivered; the real MessageTransport will drive the same path.

import { create } from 'zustand';

import { newId } from '@/lib/id';
import { conversations as seedConversations, me, messagesByConversation as seedMessages } from '@/lib/mockData';
import type { Conversation, DeliveryStatus, Message, MessageKind, Reaction } from '@/types/models';

interface SendExtras {
  replyToId?: string;
}

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  sendText: (conversationId: string, text: string, extras?: SendExtras) => void;
  sendVoice: (conversationId: string, durationSec: number) => void;
  sendImage: (conversationId: string, mediaUrl: string) => void;
  sendDocument: (conversationId: string, fileName: string, fileSize: string) => void;
  sendSticker: (conversationId: string, stickerId: string) => void;
  sendLocation: (conversationId: string, label: string) => void;
  sendContact: (conversationId: string, name: string, username: string) => void;
  sendPoll: (conversationId: string, question: string, options: string[]) => void;
  addReaction: (conversationId: string, messageId: string, key: string) => void;
  toggleStar: (conversationId: string, messageId: string) => void;
  togglePinMessage: (conversationId: string, messageId: string) => void;
  editMessage: (conversationId: string, messageId: string, text: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  forwardMessage: (fromId: string, messageId: string, toId: string) => void;
  markRead: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
  createGroup: (name: string, memberIds: string[]) => string;
}

function previewFor(kind: MessageKind, text?: string): string {
  switch (kind) {
    case 'text':
      return text ?? '';
    case 'image':
      return 'Photo';
    case 'voice':
      return 'Voice message';
    case 'document':
      return 'Document';
    case 'location':
      return 'Location';
    case 'contact':
      return 'Contact';
    case 'poll':
      return 'Poll';
    case 'sticker':
      return 'Sticker';
    case 'system':
      return '';
  }
}

export const useChatStore = create<ChatState>((set) => {
  const advance = (conversationId: string, id: string) => {
    const step = (status: DeliveryStatus, delay: number) =>
      setTimeout(() => {
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] ?? []).map((m) => (m.id === id ? { ...m, status } : m)),
          },
        }));
      }, delay);
    step('sent', 350);
    step('delivered', 850);
  };

  const append = (conversationId: string, message: Message) => {
    set((state) => ({
      messages: { ...state.messages, [conversationId]: [...(state.messages[conversationId] ?? []), message] },
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessagePreview: previewFor(message.kind, message.text), lastMessageAt: message.createdAt }
          : c,
      ),
    }));
    advance(conversationId, message.id);
  };

  const update = (conversationId: string, messageId: string, fn: (m: Message) => Message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map((m) => (m.id === messageId ? fn(m) : m)),
      },
    }));

  const base = (conversationId: string, kind: MessageKind): Message => ({
    id: newId(),
    conversationId,
    senderId: me.id,
    kind,
    createdAt: new Date().toISOString(),
    status: 'sending',
  });

  return {
    conversations: seedConversations,
    messages: seedMessages,

    sendText: (conversationId, text, extras) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      append(conversationId, { ...base(conversationId, 'text'), text: trimmed, replyToId: extras?.replyToId });
    },
    sendVoice: (conversationId, durationSec) => append(conversationId, { ...base(conversationId, 'voice'), durationSec }),
    sendImage: (conversationId, mediaUrl) => append(conversationId, { ...base(conversationId, 'image'), mediaUrl }),
    sendDocument: (conversationId, fileName, fileSize) =>
      append(conversationId, { ...base(conversationId, 'document'), fileName, fileSize }),
    sendSticker: (conversationId, stickerId) => append(conversationId, { ...base(conversationId, 'sticker'), stickerId }),
    sendLocation: (conversationId, label) =>
      append(conversationId, { ...base(conversationId, 'location'), locationLabel: label, latitude: 51.5074, longitude: -0.1278 }),
    sendContact: (conversationId, name, username) =>
      append(conversationId, { ...base(conversationId, 'contact'), contactName: name, contactUsername: username }),
    sendPoll: (conversationId, question, options) =>
      append(conversationId, {
        ...base(conversationId, 'poll'),
        poll: { question, multiple: false, totalVotes: 0, options: options.map((label, i) => ({ id: `po${i}`, label, votes: 0 })) },
      }),

    addReaction: (conversationId, messageId, key) =>
      update(conversationId, messageId, (m) => {
        const reactions = m.reactions ?? [];
        const has = reactions.some((r) => r.key === key);
        const next: Reaction[] = has
          ? reactions
              .map((r) =>
                r.key === key
                  ? {
                      ...r,
                      userIds: r.userIds.includes(me.id)
                        ? r.userIds.filter((u) => u !== me.id)
                        : [...r.userIds, me.id],
                    }
                  : r,
              )
              .filter((r) => r.userIds.length > 0)
          : [...reactions, { key, userIds: [me.id] }];
        return { ...m, reactions: next };
      }),

    toggleStar: (conversationId, messageId) =>
      update(conversationId, messageId, (m) => ({ ...m, starred: !m.starred })),
    togglePinMessage: (conversationId, messageId) =>
      update(conversationId, messageId, (m) => ({ ...m, pinned: !m.pinned })),
    editMessage: (conversationId, messageId, text) =>
      update(conversationId, messageId, (m) => ({ ...m, text: text.trim(), editedAt: new Date().toISOString() })),
    deleteMessage: (conversationId, messageId) =>
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] ?? []).filter((m) => m.id !== messageId),
        },
      })),

    forwardMessage: (fromId, messageId, toId) =>
      set((state) => {
        const src = (state.messages[fromId] ?? []).find((m) => m.id === messageId);
        if (!src) return {};
        const forwarded: Message = {
          ...src,
          id: newId(),
          conversationId: toId,
          senderId: me.id,
          createdAt: new Date().toISOString(),
          status: 'sent',
          forwardedFrom: src.senderId,
          reactions: undefined,
          starred: false,
          pinned: false,
        };
        return {
          messages: { ...state.messages, [toId]: [...(state.messages[toId] ?? []), forwarded] },
          conversations: state.conversations.map((c) =>
            c.id === toId
              ? { ...c, lastMessagePreview: previewFor(forwarded.kind, forwarded.text), lastMessageAt: forwarded.createdAt }
              : c,
          ),
        };
      }),

    markRead: (conversationId) =>
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      })),
    togglePin: (conversationId) =>
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, pinned: !c.pinned } : c)),
      })),
    createGroup: (name, memberIds) => {
      const id = newId();
      const conversation: Conversation = {
        id,
        kind: 'group',
        title: name,
        participantIds: [me.id, ...memberIds],
        unreadCount: 0,
        pinned: false,
        muted: false,
        encrypted: true,
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: 'New group',
      };
      set((state) => ({ conversations: [conversation, ...state.conversations] }));
      return id;
    },
  };
});
