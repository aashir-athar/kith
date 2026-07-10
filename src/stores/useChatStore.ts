// Local-first chat state. Optimistic send for every message kind, plus the full set of
// message actions (react, star, pin, edit, delete, forward, reply). The mock transport
// advances sending -> sent -> delivered; the real MessageTransport will drive the same path.

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { api } from '@/api/client';
import { openFrom, openGroupEnvelope } from '@/crypto/e2e';
import { newId } from '@/lib/id';
import { conversationPeer, conversations as seedConversations, me, messagesByConversation as seedMessages, registerUser, usersById } from '@/lib/mockData';
import { BACKEND_ENABLED } from '@/net/config';
import { type Content, decodeContent } from '@/net/content';
import { uploadLocalMedia } from '@/net/media';
import { type IncomingContent, messaging, toIncomingContent } from '@/net/messaging';
import { encryptedStorage } from '@/net/secureStorage';
import { useSessionStore } from '@/stores/useSessionStore';
import type { Conversation, DeliveryStatus, Message, MessageKind, Reaction } from '@/types/models';

interface SendExtras {
  replyToId?: string;
}

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  blockedUserIds: string[];
  verifiedKeys: Record<string, string>;
  // Server seqs of disappearing messages already removed locally, so they never re-hydrate.
  expiredSeqs: Record<string, number[]>;
  sendText: (conversationId: string, text: string, extras?: SendExtras) => void;
  sendVoice: (conversationId: string, uri: string, durationSec: number) => void;
  sendImage: (conversationId: string, mediaUrl: string) => void;
  sendDocument: (conversationId: string, uri: string, fileName: string, sizeBytes?: number) => void;
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
  setConversationMuted: (conversationId: string, muted: boolean) => void;
  markVerified: (conversationId: string, peerId: string, ikPubHex: string) => void;
  unmarkVerified: (conversationId: string, peerId: string) => void;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  createGroup: (name: string, memberIds: string[]) => string;
  createDirect: (userId: string) => string;
  setDisappearing: (conversationId: string, seconds: number) => void;
  sweepExpired: () => void;
  receiveServerMessage: (input: { serverConversationId: string; seq: number; senderId: string; content: IncomingContent; createdAt: number; expiresInSec?: number }) => void;
  applyTimer: (input: { serverConversationId: string; seconds: number }) => void;
  applyRemoteReaction: (input: { serverConversationId: string; targetSeq: number; key: string; remove: boolean; senderId: string }) => void;
  applyRemotePin: (input: { serverConversationId: string; targetSeq: number; pinned: boolean }) => void;
  applySentAck: (input: { clientId: string; seq: number; id: string }) => void;
  applyReceipt: (input: { conversationId: string; seq: number; userId: string; kind: 'delivered' | 'read' }) => void;
  applyEdited: (input: { conversationId: string; seq: number; text: string; editedAt: number }) => void;
  applyDeleted: (input: { conversationId: string; seq: number }) => void;
  hydrateFromServer: () => Promise<void>;
  ensureServerConversation: (serverConversationId: string) => Promise<void>;
  hydrateHistory: (localConversationId: string) => Promise<void>;
  syncAll: () => void;
  startDirectWithUsername: (username: string) => Promise<string | null>;
}

/** Idempotent set-op on a message's reactions: ensure a user's reaction with `key` is present, or
 * absent when `remove`. Used for both local taps and replayed remote reactions. */
function reactionSetOp(reactions: Reaction[] | undefined, userId: string, key: string, remove: boolean): Reaction[] {
  const list = reactions ?? [];
  if (remove) {
    return list.map((r) => (r.key === key ? { ...r, userIds: r.userIds.filter((u) => u !== userId) } : r)).filter((r) => r.userIds.length > 0);
  }
  if (list.some((r) => r.key === key)) {
    return list.map((r) => (r.key === key && !r.userIds.includes(userId) ? { ...r, userIds: [...r.userIds, userId] } : r));
  }
  return [...list, { key, userIds: [userId] }];
}

function formatBytes(size?: number): string | undefined {
  if (size == null) return undefined;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/** Map a decoded incoming payload to the Message fields for that kind. */
function messageFieldsFromContent(content: IncomingContent): Partial<Message> & { kind: MessageKind } {
  switch (content.kind) {
    case 'text':
      return { kind: 'text', text: content.text };
    case 'image':
    case 'voice':
    case 'document':
      return { kind: content.kind, blob: content.blob, mime: content.mime, fileName: content.name, fileSize: formatBytes(content.size), durationSec: content.durationSec };
    case 'sticker':
      return { kind: 'sticker', stickerId: content.stickerId };
    case 'location':
      return { kind: 'location', locationLabel: content.label, latitude: content.latitude, longitude: content.longitude };
    case 'contact':
      return { kind: 'contact', contactName: content.name, contactUsername: content.username };
    case 'poll':
      return {
        kind: 'poll',
        poll: { question: content.question, multiple: false, totalVotes: 0, options: content.options.map((label, i) => ({ id: `po${i}`, label, votes: 0 })) },
      };
  }
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

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
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

  // The peer's handle for a direct conversation in backend mode, or undefined (mock / group / none).
  const realDirectPeer = (conversationId: string): string | undefined => {
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (!BACKEND_ENABLED || conv?.kind !== 'direct') return undefined;
    return conv.peerUsername ?? conversationPeer(conv)?.username;
  };

  // Seal + send arbitrary content (sticker, location, contact, poll, media ref) to the peer.
  const sendContentReal = async (localConvId: string, peerUsername: string, clientId: string, content: Content) => {
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
      const ok = await messaging.sendContent(serverId, peerUsername, clientId, content);
      if (!ok) update(localConvId, clientId, (m) => ({ ...m, status: 'failed' }));
    } catch {
      update(localConvId, clientId, (m) => ({ ...m, status: 'failed' }));
    }
  };

  // The other members of a backend group (userId + handle), used to seal group messages.
  const realGroupMembers = (conversationId: string): { userId: string; username: string }[] | undefined => {
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (!BACKEND_ENABLED || conv?.kind !== 'group') return undefined;
    const members = conv.participantIds
      .filter((id) => id !== me.id)
      .map((id) => {
        const u = usersById[id];
        return u ? { userId: id, username: u.username } : null;
      })
      .filter((x): x is { userId: string; username: string } => x !== null);
    return members.length > 0 ? members : undefined;
  };

  const isRealConversation = (conversationId: string): boolean => !!realDirectPeer(conversationId) || !!realGroupMembers(conversationId);

  // Deliver content over whichever transport backs the conversation: a 1:1 seal, a group seal, or
  // the offline demo's optimistic local delivery.
  const deliverContent = async (localConvId: string, clientId: string, content: Content): Promise<void> => {
    const peerUsername = realDirectPeer(localConvId);
    if (peerUsername) {
      await sendContentReal(localConvId, peerUsername, clientId, content);
      return;
    }
    const members = realGroupMembers(localConvId);
    const serverId = get().conversations.find((c) => c.id === localConvId)?.serverId;
    if (members && serverId) {
      try {
        const ok = await messaging.sendGroupContent(serverId, members, clientId, content);
        if (!ok) update(localConvId, clientId, (m) => ({ ...m, status: 'failed' }));
      } catch {
        update(localConvId, clientId, (m) => ({ ...m, status: 'failed' }));
      }
      return;
    }
    advance(localConvId, clientId);
  };

  // Encrypt + upload a picked file, then deliver its blob ref (1:1 or group).
  const uploadAndDeliver = async (
    localConvId: string,
    clientId: string,
    uri: string,
    mediaKind: 'image' | 'voice' | 'document',
    fallbackMime: string,
    extra?: { name?: string; durationSec?: number },
  ): Promise<void> => {
    try {
      const { ref, mime, size } = await uploadLocalMedia(uri, fallbackMime);
      await deliverContent(localConvId, clientId, {
        t: 'media',
        mediaKind,
        blobId: ref.blobId,
        keyHex: ref.keyHex,
        nonceHex: ref.nonceHex,
        mime,
        size,
        name: extra?.name,
        durationSec: extra?.durationSec,
      });
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
    blockedUserIds: [],
    verifiedKeys: {},
    expiredSeqs: {},

    sendText: (conversationId, text, extras) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const conv = get().conversations.find((c) => c.id === conversationId);
      const seconds = conv?.disappearSeconds ?? 0;
      const message: Message = { ...base(conversationId, 'text'), text: trimmed, replyToId: extras?.replyToId };
      if (seconds > 0) message.expiresAt = new Date(new Date(message.createdAt).getTime() + seconds * 1000).toISOString();
      push(conversationId, message);
      void deliverContent(conversationId, message.id, { t: 'text', body: trimmed, expiresInSec: seconds > 0 ? seconds : undefined });
    },
    sendVoice: (conversationId, uri, durationSec) => {
      const message: Message = { ...base(conversationId, 'voice'), durationSec, mediaUrl: uri };
      push(conversationId, message);
      if (isRealConversation(conversationId)) void uploadAndDeliver(conversationId, message.id, uri, 'voice', 'audio/mp4', { durationSec });
      else advance(conversationId, message.id);
    },
    sendImage: (conversationId, mediaUrl) => {
      const message: Message = { ...base(conversationId, 'image'), mediaUrl };
      push(conversationId, message);
      if (isRealConversation(conversationId)) void uploadAndDeliver(conversationId, message.id, mediaUrl, 'image', 'image/jpeg');
      else advance(conversationId, message.id);
    },
    sendDocument: (conversationId, uri, fileName, sizeBytes) => {
      const message: Message = { ...base(conversationId, 'document'), fileName, fileSize: formatBytes(sizeBytes), mediaUrl: uri };
      push(conversationId, message);
      if (isRealConversation(conversationId)) void uploadAndDeliver(conversationId, message.id, uri, 'document', 'application/octet-stream', { name: fileName });
      else advance(conversationId, message.id);
    },
    sendSticker: (conversationId, stickerId) => {
      const message: Message = { ...base(conversationId, 'sticker'), stickerId };
      push(conversationId, message);
      void deliverContent(conversationId, message.id, { t: 'sticker', stickerId });
    },
    sendLocation: (conversationId, label) => {
      const message: Message = { ...base(conversationId, 'location'), locationLabel: label, latitude: 51.5074, longitude: -0.1278 };
      push(conversationId, message);
      void deliverContent(conversationId, message.id, { t: 'location', label, latitude: 51.5074, longitude: -0.1278 });
    },
    sendContact: (conversationId, name, username) => {
      const message: Message = { ...base(conversationId, 'contact'), contactName: name, contactUsername: username };
      push(conversationId, message);
      void deliverContent(conversationId, message.id, { t: 'contact', name, username });
    },
    sendPoll: (conversationId, question, options) => {
      const message: Message = {
        ...base(conversationId, 'poll'),
        poll: { question, multiple: false, totalVotes: 0, options: options.map((label, i) => ({ id: `po${i}`, label, votes: 0 })) },
      };
      push(conversationId, message);
      void deliverContent(conversationId, message.id, { t: 'poll', question, options });
    },

    addReaction: (conversationId, messageId, key) => {
      const msg = (get().messages[conversationId] ?? []).find((m) => m.id === messageId);
      const remove = !!msg?.reactions?.some((r) => r.key === key && r.userIds.includes(me.id));
      update(conversationId, messageId, (m) => ({ ...m, reactions: reactionSetOp(m.reactions, me.id, key, remove) }));
      const conv = get().conversations.find((c) => c.id === conversationId);
      const peerUsername = conv ? (conv.peerUsername ?? conversationPeer(conv)?.username) : undefined;
      if (BACKEND_ENABLED && conv?.serverId && peerUsername && msg?.serverSeq != null) {
        void messaging.sendReaction(conv.serverId, peerUsername, msg.serverSeq, key, remove);
      }
    },

    toggleStar: (conversationId, messageId) =>
      update(conversationId, messageId, (m) => ({ ...m, starred: !m.starred })),
    togglePinMessage: (conversationId, messageId) => {
      const msg = (get().messages[conversationId] ?? []).find((m) => m.id === messageId);
      const pinned = !msg?.pinned;
      update(conversationId, messageId, (m) => ({ ...m, pinned }));
      const conv = get().conversations.find((c) => c.id === conversationId);
      const peerUsername = conv ? (conv.peerUsername ?? conversationPeer(conv)?.username) : undefined;
      if (BACKEND_ENABLED && conv?.serverId && peerUsername && msg?.serverSeq != null) {
        void messaging.sendPin(conv.serverId, peerUsername, msg.serverSeq, pinned);
      }
    },
    editMessage: (conversationId, messageId, text) => {
      update(conversationId, messageId, (m) => ({ ...m, text: text.trim(), editedAt: new Date().toISOString() }));
      const conv = get().conversations.find((c) => c.id === conversationId);
      const msg = (get().messages[conversationId] ?? []).find((m) => m.id === messageId);
      if (BACKEND_ENABLED && conv?.serverId && conv.peerUsername && msg?.serverSeq && msg.senderId === me.id) {
        void messaging.sendEdit(conv.serverId, conv.peerUsername, msg.serverSeq, text.trim());
      }
    },
    retryMessage: (conversationId, messageId) => {
      const msg = (get().messages[conversationId] ?? []).find((m) => m.id === messageId);
      update(conversationId, messageId, (m) => ({ ...m, status: 'sending' }));
      if (isRealConversation(conversationId) && msg?.text) void deliverContent(conversationId, messageId, { t: 'text', body: msg.text });
      else advance(conversationId, messageId);
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

    forwardMessage: (fromId, messageId, toId) => {
      const src = (get().messages[fromId] ?? []).find((m) => m.id === messageId);
      if (!src) return;
      const real = isRealConversation(toId) && src.kind === 'text' && !!src.text;
      const forwarded: Message = {
        ...src,
        id: newId(),
        conversationId: toId,
        senderId: me.id,
        createdAt: new Date().toISOString(),
        status: real ? 'sending' : 'sent',
        forwardedFrom: src.senderId,
        reactions: undefined,
        starred: false,
        pinned: false,
      };
      push(toId, forwarded);
      if (real && src.text) void deliverContent(toId, forwarded.id, { t: 'text', body: src.text });
    },

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
    setConversationMuted: (conversationId, muted) => {
      set((state) => ({ conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, muted } : c)) }));
      const conv = get().conversations.find((c) => c.id === conversationId);
      const token = useSessionStore.getState().serverToken;
      if (BACKEND_ENABLED && conv?.serverId && token) void api.setMute(token, conv.serverId, muted).catch(() => undefined);
    },
    setDisappearing: (conversationId, seconds) => {
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, disappearSeconds: seconds > 0 ? seconds : undefined } : c)),
      }));
      const conv = get().conversations.find((c) => c.id === conversationId);
      const peerUsername = conv ? (conv.peerUsername ?? conversationPeer(conv)?.username) : undefined;
      if (BACKEND_ENABLED && conv?.serverId && peerUsername) void messaging.sendTimer(conv.serverId, peerUsername, seconds);
    },
    applyTimer: ({ serverConversationId, seconds }) =>
      set((state) => ({
        conversations: state.conversations.map((c) => (c.serverId === serverConversationId ? { ...c, disappearSeconds: seconds > 0 ? seconds : undefined } : c)),
      })),
    sweepExpired: () => {
      const now = Date.now();
      set((state) => {
        const messages: Record<string, Message[]> = { ...state.messages };
        const expiredSeqs: Record<string, number[]> = { ...state.expiredSeqs };
        let changed = false;
        for (const [cid, list] of Object.entries(state.messages)) {
          const kept: Message[] = [];
          const newlyExpired: number[] = [];
          for (const m of list) {
            if (m.expiresAt && new Date(m.expiresAt).getTime() <= now) {
              if (m.serverSeq != null) newlyExpired.push(m.serverSeq);
            } else {
              kept.push(m);
            }
          }
          if (kept.length !== list.length) {
            changed = true;
            messages[cid] = kept;
            if (newlyExpired.length > 0) expiredSeqs[cid] = [...(expiredSeqs[cid] ?? []), ...newlyExpired];
          }
        }
        return changed ? { messages, expiredSeqs } : {};
      });
    },
    markVerified: (conversationId, peerId, ikPubHex) =>
      set((state) => ({
        verifiedKeys: { ...state.verifiedKeys, [peerId]: ikPubHex },
        conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, verified: true } : c)),
      })),
    unmarkVerified: (conversationId, peerId) =>
      set((state) => {
        const next = { ...state.verifiedKeys };
        delete next[peerId];
        return { verifiedKeys: next, conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, verified: false } : c)) };
      }),
    blockUser: (userId) => {
      set((state) => ({
        blockedUserIds: state.blockedUserIds.includes(userId) ? state.blockedUserIds : [...state.blockedUserIds, userId],
        // Hide any direct thread with them from the active list; their inbound is dropped on arrival.
        conversations: state.conversations.map((c) =>
          c.kind === 'direct' && c.participantIds.includes(userId) ? { ...c, archived: true } : c,
        ),
      }));
      // Server-enforced: the relay stops forwarding and pushing their traffic and hides it from reads.
      const token = useSessionStore.getState().serverToken;
      const username = usersById[userId]?.username;
      if (BACKEND_ENABLED && token && username) void api.block(token, username).catch(() => undefined);
    },
    unblockUser: (userId) => {
      set((state) => ({ blockedUserIds: state.blockedUserIds.filter((u) => u !== userId) }));
      const token = useSessionStore.getState().serverToken;
      const username = usersById[userId]?.username;
      if (BACKEND_ENABLED && token && username) void api.unblock(token, username).catch(() => undefined);
    },
    createGroup: (name, memberIds) => {
      const id = newId();
      const memberUsers = memberIds.map((mid) => usersById[mid]).filter((u): u is (typeof usersById)[string] => !!u);
      const conversation: Conversation = {
        id,
        kind: 'group',
        title: name,
        participantIds: [me.id, ...memberUsers.map((u) => u.id)],
        unreadCount: 0,
        pinned: false,
        muted: false,
        encrypted: true,
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: 'New group',
      };
      set((state) => ({ conversations: [conversation, ...state.conversations] }));
      // In a live build, create the group on the relay and reconcile the server id + members.
      const token = useSessionStore.getState().serverToken;
      const myServerId = useSessionStore.getState().serverUserId;
      if (BACKEND_ENABLED && token && memberUsers.length > 0) {
        void api
          .createGroup(token, name, memberUsers.map((u) => u.username))
          .then((res) => {
            for (const p of res.participants) registerUser({ id: p.id, username: p.username, displayName: p.displayName });
            const others = res.participants.filter((p) => p.id !== myServerId).map((p) => p.id);
            set((state) => ({
              conversations: state.conversations.map((c) => (c.id === id ? { ...c, serverId: res.id, participantIds: [me.id, ...others] } : c)),
            }));
          })
          .catch(() => undefined);
      }
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

    receiveServerMessage: ({ serverConversationId, seq, senderId, content, createdAt, expiresInSec }) => {
      const conv = get().conversations.find((c) => c.serverId === serverConversationId);
      if (!conv || hasSeq(conv.id, seq)) return;
      if ((get().expiredSeqs[conv.id] ?? []).includes(seq)) return; // already expired locally; do not resurrect
      if (get().blockedUserIds.includes(senderId)) return; // blocked sender (direct peer or group member)
      const fields = messageFieldsFromContent(content);
      push(conv.id, {
        id: newId(),
        conversationId: conv.id,
        senderId,
        ...fields,
        createdAt: new Date(createdAt).toISOString(),
        status: 'read',
        serverSeq: seq,
        expiresAt: expiresInSec ? new Date(createdAt + expiresInSec * 1000).toISOString() : undefined,
      });
      const preview = previewFor(fields.kind, fields.text);
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === conv.id ? { ...c, unreadCount: c.unreadCount + 1, lastMessagePreview: preview } : c)),
      }));
    },

    applyRemoteReaction: ({ serverConversationId, targetSeq, key, remove, senderId }) => {
      const conv = get().conversations.find((c) => c.serverId === serverConversationId);
      if (!conv) return;
      const reactorLocalId = conversationPeer(conv)?.id ?? senderId;
      set((state) => ({
        messages: {
          ...state.messages,
          [conv.id]: (state.messages[conv.id] ?? []).map((m) =>
            m.serverSeq === targetSeq ? { ...m, reactions: reactionSetOp(m.reactions, reactorLocalId, key, remove) } : m,
          ),
        },
      }));
    },

    applyRemotePin: ({ serverConversationId, targetSeq, pinned }) => {
      const conv = get().conversations.find((c) => c.serverId === serverConversationId);
      if (!conv) return;
      set((state) => ({
        messages: {
          ...state.messages,
          [conv.id]: (state.messages[conv.id] ?? []).map((m) => (m.serverSeq === targetSeq ? { ...m, pinned } : m)),
        },
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
        for (const m of s.members) registerUser({ id: m.id, username: m.username, displayName: m.displayName });
        return {
          id: s.id,
          kind: s.kind,
          serverId: s.id,
          title: s.kind === 'group' ? (s.name ?? 'Group') : undefined,
          peerUsername: s.kind === 'direct' ? s.peer?.username : undefined,
          participantIds: [me.id, ...s.members.map((m) => m.id)],
          unreadCount: s.unreadCount,
          pinned: false,
          muted: false,
          encrypted: true,
          lastMessageAt: s.lastMessage ? new Date(s.lastMessage.createdAt).toISOString() : undefined,
          lastMessagePreview: s.lastMessage ? 'Encrypted message' : '',
        };
      });
      // Preserve device-local flags (mute, disappearing, verified, archive, pin) across hydration.
      set((state) => {
        const prev = new Map(state.conversations.filter((c) => c.serverId).map((c) => [c.serverId, c]));
        return {
          conversations: convs.map((c) => {
            const existing = c.serverId ? prev.get(c.serverId) : undefined;
            return existing
              ? { ...c, muted: existing.muted, disappearSeconds: existing.disappearSeconds, verified: existing.verified, archived: existing.archived, pinned: existing.pinned }
              : c;
          }),
        };
      });
    },

    ensureServerConversation: async (serverConversationId) => {
      if (get().conversations.some((c) => c.serverId === serverConversationId)) return;
      // Pull the authoritative list, which returns the conversation with its correct kind and
      // members (direct or group). Simpler and correct for both.
      await get().hydrateFromServer();
    },

    hydrateHistory: async (localConversationId) => {
      const token = useSessionStore.getState().serverToken;
      const conv = get().conversations.find((c) => c.id === localConversationId);
      if (!token || !conv?.serverId) return;
      const myServerId = useSessionStore.getState().serverUserId;
      const peerLocalId = conversationPeer(conv)?.id ?? localConversationId;
      const { messages: dtos } = await api.history(token, conv.serverId);
      const expired = get().expiredSeqs[localConversationId] ?? [];
      const loaded: Message[] = [];
      const reactions: { targetSeq: number; key: string; remove: boolean }[] = [];
      const pins: { targetSeq: number; pinned: boolean }[] = [];
      let timerSeconds: number | undefined;
      for (const dto of dtos) {
        // Own sent messages are sealed to the peer (not re-decryptable here); they live locally.
        // Skip anything already expired locally, so disappearing messages never come back.
        if (dto.senderId === myServerId || hasSeq(localConversationId, dto.seq) || expired.includes(dto.seq)) continue;
        if (dto.deleted) {
          loaded.push({ id: dto.id, conversationId: localConversationId, senderId: dto.senderId, kind: 'text', deleted: true, createdAt: new Date(dto.createdAt).toISOString(), status: 'read', serverSeq: dto.seq });
          continue;
        }
        try {
          const env = dto.envelope;
          let plaintext: string | null;
          if (env.type === 'group') {
            plaintext = myServerId ? await openGroupEnvelope(env, myServerId) : null;
          } else {
            plaintext = await openFrom(env);
          }
          if (plaintext == null) continue;
          const content = decodeContent(plaintext);
          if (content.t === 'reaction') {
            reactions.push({ targetSeq: content.targetSeq, key: content.key, remove: content.remove });
            continue;
          }
          if (content.t === 'pin') {
            pins.push({ targetSeq: content.targetSeq, pinned: content.pinned });
            continue;
          }
          if (content.t === 'timer') {
            timerSeconds = content.seconds;
            continue;
          }
          const fields = messageFieldsFromContent(toIncomingContent(content));
          loaded.push({
            id: dto.id,
            conversationId: localConversationId,
            senderId: dto.senderId,
            ...fields,
            editedAt: dto.editedAt ? new Date(dto.editedAt).toISOString() : undefined,
            createdAt: new Date(dto.createdAt).toISOString(),
            status: 'read',
            serverSeq: dto.seq,
            expiresAt: content.t === 'text' && content.expiresInSec ? new Date(dto.createdAt + content.expiresInSec * 1000).toISOString() : undefined,
          });
        } catch {
          // undecryptable; skip
        }
      }
      if (loaded.length === 0 && reactions.length === 0 && pins.length === 0 && timerSeconds === undefined) return;
      set((state) => {
        let list = [...(state.messages[localConversationId] ?? []), ...loaded].sort((a, b) => (a.serverSeq ?? 0) - (b.serverSeq ?? 0));
        for (const r of reactions) {
          list = list.map((m) => (m.serverSeq === r.targetSeq ? { ...m, reactions: reactionSetOp(m.reactions, peerLocalId, r.key, r.remove) } : m));
        }
        for (const p of pins) {
          list = list.map((m) => (m.serverSeq === p.targetSeq ? { ...m, pinned: p.pinned } : m));
        }
        return {
          messages: { ...state.messages, [localConversationId]: list },
          conversations:
            timerSeconds === undefined
              ? state.conversations
              : state.conversations.map((c) => (c.id === localConversationId ? { ...c, disappearSeconds: timerSeconds > 0 ? timerSeconds : undefined } : c)),
        };
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
    },
    {
      name: 'kith-chat',
      storage: createJSONStorage(() => encryptedStorage),
      // Persist only the local-first message data (encrypted at rest); actions are recreated.
      partialize: (state) => ({
        conversations: state.conversations,
        messages: state.messages,
        blockedUserIds: state.blockedUserIds,
        verifiedKeys: state.verifiedKeys,
        expiredSeqs: state.expiredSeqs,
      }),
    },
  ),
);
