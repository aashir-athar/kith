// Local-first chat state. Optimistic send for every message kind, plus the full set of
// message actions (react, star, pin, edit, delete, forward, reply). The mock transport
// advances sending -> sent -> delivered; the real MessageTransport will drive the same path.

import { create } from 'zustand';

import { api } from '@/api/client';
import { openFrom } from '@/crypto/e2e';
import { newId } from '@/lib/id';
import { conversationPeer, conversations as seedConversations, me, messagesByConversation as seedMessages, registerUser, usersById } from '@/lib/mockData';
import { BACKEND_ENABLED } from '@/net/config';
import { messaging } from '@/net/messaging';
import { useSessionStore } from '@/stores/useSessionStore';
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
  retryMessage: (conversationId: string, messageId: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  forwardMessage: (fromId: string, messageId: string, toId: string) => void;
  markRead: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
  toggleArchive: (conversationId: string) => void;
  createGroup: (name: string, memberIds: string[]) => string;
  createDirect: (userId: string) => string;
  receiveServerMessage: (input: { serverConversationId: string; seq: number; senderId: string; text: string; createdAt: number }) => void;
  applySentAck: (input: { clientId: string; seq: number; id: string }) => void;
  applyReceipt: (input: { conversationId: string; seq: number; userId: string; kind: 'delivered' | 'read' }) => void;
  applyEdited: (input: { conversationId: string; seq: number; text: string; editedAt: number }) => void;
  applyDeleted: (input: { conversationId: string; seq: number }) => void;
  hydrateFromServer: () => Promise<void>;
  ensureServerConversation: (serverConversationId: string, senderId: string) => Promise<void>;
  hydrateHistory: (localConversationId: string) => Promise<void>;
  syncAll: () => void;
  startDirectWithUsername: (username: string) => Promise<string | null>;
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

export const useChatStore = create<ChatState>((set, get) => {
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

  const push = (conversationId: string, message: Message) => {
    set((state) => ({
      messages: { ...state.messages, [conversationId]: [...(state.messages[conversationId] ?? []), message] },
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessagePreview: previewFor(message.kind, message.text), lastMessageAt: message.createdAt }
          : c,
      ),
    }));
  };

  const append = (conversationId: string, message: Message) => {
    push(conversationId, message);
    advance(conversationId, message.id);
  };

  // Real send path (BACKEND_ENABLED): resolve the server conversation, seal, and emit. Delivery
  // is confirmed by the server 'sent' ack (applySentAck); failure flips the bubble to retry.
  const sendReal = async (localConvId: string, peerUsername: string, clientId: string, text: string) => {
    const token = useSessionStore.getState().serverToken;
    if (!token) {
      update(localConvId, clientId, (m) => ({ ...m, status: 'failed' }));
      return;
    }
    try {
      let serverId = get().conversations.find((c) => c.id === localConvId)?.serverId;
      if (!serverId) {
        const direct = await api.createDirect(token, peerUsername);
        serverId = direct.id;
        set((state) => ({ conversations: state.conversations.map((c) => (c.id === localConvId ? { ...c, serverId: direct.id } : c)) }));
      }
      const ok = await messaging.sendText(serverId, peerUsername, clientId, text);
      if (!ok) update(localConvId, clientId, (m) => ({ ...m, status: 'failed' }));
    } catch {
      update(localConvId, clientId, (m) => ({ ...m, status: 'failed' }));
    }
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

  const hasSeq = (convId: string, seq: number) => (get().messages[convId] ?? []).some((m) => m.serverSeq === seq);

  return {
    // In backend mode the list is hydrated from the server; the mock seed is only for offline demo.
    conversations: BACKEND_ENABLED ? [] : seedConversations,
    messages: BACKEND_ENABLED ? {} : seedMessages,

    sendText: (conversationId, text, extras) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const message: Message = { ...base(conversationId, 'text'), text: trimmed, replyToId: extras?.replyToId };
      push(conversationId, message);
      const conv = get().conversations.find((c) => c.id === conversationId);
      const peerUsername = conv ? (conv.peerUsername ?? conversationPeer(conv)?.username) : undefined;
      if (BACKEND_ENABLED && conv?.kind === 'direct' && peerUsername) {
        void sendReal(conversationId, peerUsername, message.id, trimmed);
      } else {
        advance(conversationId, message.id);
      }
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
    editMessage: (conversationId, messageId, text) => {
      update(conversationId, messageId, (m) => ({ ...m, text: text.trim(), editedAt: new Date().toISOString() }));
      const conv = get().conversations.find((c) => c.id === conversationId);
      const msg = (get().messages[conversationId] ?? []).find((m) => m.id === messageId);
      if (BACKEND_ENABLED && conv?.serverId && conv.peerUsername && msg?.serverSeq && msg.senderId === me.id) {
        void messaging.sendEdit(conv.serverId, conv.peerUsername, msg.serverSeq, text.trim());
      }
    },
    retryMessage: (conversationId, messageId) => {
      update(conversationId, messageId, (m) => ({ ...m, status: 'sending' }));
      advance(conversationId, messageId);
    },
    deleteMessage: (conversationId, messageId) => {
      const conv = get().conversations.find((c) => c.id === conversationId);
      const msg = (get().messages[conversationId] ?? []).find((m) => m.id === messageId);
      if (BACKEND_ENABLED && conv?.serverId && msg?.serverSeq && msg.senderId === me.id) {
        // delete-for-everyone: tombstone locally and propagate to the peer
        update(conversationId, messageId, (m) => ({ ...m, deleted: true, text: undefined }));
        messaging.sendDelete(conv.serverId, msg.serverSeq);
      } else {
        set((state) => ({
          messages: { ...state.messages, [conversationId]: (state.messages[conversationId] ?? []).filter((m) => m.id !== messageId) },
        }));
      }
    },

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

    markRead: (conversationId) => {
      const conv = get().conversations.find((c) => c.id === conversationId);
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      }));
      if (BACKEND_ENABLED && conv?.serverId) {
        const highestSeq = (get().messages[conversationId] ?? []).reduce((max, m) => Math.max(max, m.serverSeq ?? 0), 0);
        if (highestSeq > 0) messaging.markRead(conv.serverId, highestSeq);
      }
    },
    togglePin: (conversationId) =>
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, pinned: !c.pinned } : c)),
      })),
    toggleArchive: (conversationId) =>
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, archived: !c.archived } : c)),
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
    createDirect: (userId) => {
      const existing = get().conversations.find((c) => c.kind === 'direct' && c.participantIds.includes(userId));
      if (existing) return existing.id;
      const id = newId();
      const conversation: Conversation = {
        id,
        kind: 'direct',
        participantIds: [me.id, userId],
        peerUsername: usersById[userId]?.username,
        unreadCount: 0,
        pinned: false,
        muted: false,
        encrypted: true,
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: '',
      };
      set((state) => ({ conversations: [conversation, ...state.conversations] }));
      return id;
    },

    receiveServerMessage: ({ serverConversationId, seq, text, createdAt }) => {
      const conv = get().conversations.find((c) => c.serverId === serverConversationId);
      if (!conv || hasSeq(conv.id, seq)) return;
      const peer = conversationPeer(conv);
      push(conv.id, {
        id: newId(),
        conversationId: conv.id,
        senderId: peer?.id ?? conv.id,
        kind: 'text',
        text,
        createdAt: new Date(createdAt).toISOString(),
        status: 'read',
        serverSeq: seq,
      });
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conv.id ? { ...c, unreadCount: c.unreadCount + 1, lastMessagePreview: text } : c)),
      }));
    },

    applySentAck: ({ clientId, seq }) => {
      set((state) => {
        const messages: Record<string, Message[]> = {};
        for (const [cid, list] of Object.entries(state.messages)) {
          messages[cid] = list.map((m) => (m.id === clientId ? { ...m, status: 'sent', serverSeq: seq } : m));
        }
        return { messages };
      });
    },

    applyReceipt: ({ conversationId, seq, kind }) => {
      const conv = get().conversations.find((c) => c.serverId === conversationId);
      if (!conv) return;
      set((state) => ({
        messages: {
          ...state.messages,
          [conv.id]: (state.messages[conv.id] ?? []).map((m) =>
            m.senderId === me.id && (m.serverSeq ?? 0) <= seq && m.status !== 'read' ? { ...m, status: kind } : m,
          ),
        },
      }));
    },

    applyEdited: ({ conversationId, seq, text, editedAt }) => {
      const conv = get().conversations.find((c) => c.serverId === conversationId);
      if (!conv) return;
      set((state) => ({
        messages: {
          ...state.messages,
          [conv.id]: (state.messages[conv.id] ?? []).map((m) =>
            m.serverSeq === seq ? { ...m, text, editedAt: new Date(editedAt).toISOString(), deleted: false } : m,
          ),
        },
      }));
    },

    applyDeleted: ({ conversationId, seq }) => {
      const conv = get().conversations.find((c) => c.serverId === conversationId);
      if (!conv) return;
      set((state) => ({
        messages: {
          ...state.messages,
          [conv.id]: (state.messages[conv.id] ?? []).map((m) => (m.serverSeq === seq ? { ...m, deleted: true, text: undefined } : m)),
        },
      }));
    },

    hydrateFromServer: async () => {
      const token = useSessionStore.getState().serverToken;
      if (!token) return;
      const { conversations: summaries } = await api.listConversations(token);
      const convs: Conversation[] = summaries.map((s) => {
        if (s.peer) registerUser({ id: s.peer.id, username: s.peer.username, displayName: s.peer.displayName });
        return {
          id: s.id,
          kind: s.kind,
          serverId: s.id,
          peerUsername: s.peer?.username,
          participantIds: s.peer ? [me.id, s.peer.id] : [me.id],
          unreadCount: s.unreadCount,
          pinned: false,
          muted: false,
          encrypted: true,
          lastMessageAt: s.lastMessage ? new Date(s.lastMessage.createdAt).toISOString() : undefined,
          lastMessagePreview: s.lastMessage ? 'Encrypted message' : '',
        };
      });
      set({ conversations: convs });
    },

    ensureServerConversation: async (serverConversationId, senderId) => {
      if (get().conversations.some((c) => c.serverId === serverConversationId)) return;
      const token = useSessionStore.getState().serverToken;
      if (!token) return;
      try {
        const peer = await api.user(token, senderId);
        registerUser({ id: peer.id, username: peer.username, displayName: peer.displayName });
        const conversation: Conversation = {
          id: serverConversationId,
          kind: 'direct',
          serverId: serverConversationId,
          peerUsername: peer.username,
          participantIds: [me.id, peer.id],
          unreadCount: 0,
          pinned: false,
          muted: false,
          encrypted: true,
          lastMessageAt: new Date().toISOString(),
          lastMessagePreview: '',
        };
        set((state) => ({ conversations: [conversation, ...state.conversations] }));
      } catch {
        await get().hydrateFromServer();
      }
    },

    hydrateHistory: async (localConversationId) => {
      const token = useSessionStore.getState().serverToken;
      const conv = get().conversations.find((c) => c.id === localConversationId);
      if (!token || !conv?.serverId) return;
      const myServerId = useSessionStore.getState().serverUserId;
      const peerLocalId = conversationPeer(conv)?.id ?? localConversationId;
      const { messages: dtos } = await api.history(token, conv.serverId);
      const loaded: Message[] = [];
      for (const dto of dtos) {
        // Own sent messages are sealed to the peer (not re-decryptable here); they live locally.
        if (dto.senderId === myServerId || hasSeq(localConversationId, dto.seq)) continue;
        if (dto.deleted) {
          loaded.push({ id: dto.id, conversationId: localConversationId, senderId: peerLocalId, kind: 'text', deleted: true, createdAt: new Date(dto.createdAt).toISOString(), status: 'read', serverSeq: dto.seq });
          continue;
        }
        try {
          const text = await openFrom(dto.envelope);
          loaded.push({
            id: dto.id,
            conversationId: localConversationId,
            senderId: peerLocalId,
            kind: 'text',
            text,
            editedAt: dto.editedAt ? new Date(dto.editedAt).toISOString() : undefined,
            createdAt: new Date(dto.createdAt).toISOString(),
            status: 'read',
            serverSeq: dto.seq,
          });
        } catch {
          // undecryptable; skip
        }
      }
      if (loaded.length === 0) return;
      set((state) => {
        const merged = [...(state.messages[localConversationId] ?? []), ...loaded].sort((a, b) => (a.serverSeq ?? 0) - (b.serverSeq ?? 0));
        return { messages: { ...state.messages, [localConversationId]: merged } };
      });
    },

    syncAll: () => {
      for (const c of get().conversations) {
        if (!c.serverId) continue;
        const maxSeq = (get().messages[c.id] ?? []).reduce((max, m) => Math.max(max, m.serverSeq ?? 0), 0);
        messaging.sync(c.serverId, maxSeq);
      }
    },

    startDirectWithUsername: async (username) => {
      const token = useSessionStore.getState().serverToken;
      if (!token) return null;
      try {
        const peer = await api.lookupUser(token, username);
        registerUser({ id: peer.id, username: peer.username, displayName: peer.displayName });
        const direct = await api.createDirect(token, username);
        const existing = get().conversations.find((c) => c.serverId === direct.id);
        if (existing) return existing.id;
        const conversation: Conversation = {
          id: direct.id,
          kind: 'direct',
          serverId: direct.id,
          peerUsername: peer.username,
          participantIds: [me.id, peer.id],
          unreadCount: 0,
          pinned: false,
          muted: false,
          encrypted: true,
          lastMessageAt: new Date().toISOString(),
          lastMessagePreview: '',
        };
        set((state) => ({ conversations: [conversation, ...state.conversations] }));
        return direct.id;
      } catch {
        return null;
      }
    },
  };
});
