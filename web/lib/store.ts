// Web client state: session, conversations, and the live messaging loop over the relay. Uses the
// same crypto and socket as the phone, so a message sent from the browser opens on mobile and back.

import type { ServerFrame } from '@kith/shared';
import { create } from 'zustand';

import { api } from './api';
import { decodeContent, encodeContent } from './content';
import { buildGroupEnvelope, hasIdentity, openFrom, openGroupEnvelope, replenishPreKeys, sealTo, signChallenge } from './crypto/e2e';
import { clearAll, loadSession, saveSession } from './crypto/keystore';
import { KithSocket } from './socket';

export interface Conversation {
  id: string; // server conversation id
  kind: 'direct' | 'group';
  title: string;
  peerUsername?: string;
  members: { id: string; username: string; displayName: string }[];
  unread: number;
  lastPreview: string;
  lastAt: number;
}

export type Status = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  clientId?: string;
  seq?: number;
  senderId: string;
  text: string;
  mine: boolean;
  at: number;
  status: Status;
}

interface KithState {
  ready: boolean;
  token: string | null;
  userId: string | null;
  username: string | null;
  needsBackup: boolean;
  ackBackup: () => void;
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  activeId: string | null;
  error: string | null;
  restore: () => Promise<void>;
  register: (username: string, displayName: string) => Promise<void>;
  login: (username: string) => Promise<void>;
  restoreWithPhrase: (username: string, phrase: string) => Promise<void>;
  select: (conversationId: string) => Promise<void>;
  startChat: (username: string) => Promise<void>;
  sendText: (text: string) => Promise<void>;
  logout: () => Promise<void>;
}

let socket: KithSocket | null = null;
const cid = () => `c_${crypto.randomUUID()}`;

function connect(get: () => KithState): void {
  const token = get().token;
  if (!token || socket) return;
  socket = new KithSocket(async () => {
    const { ticket } = await api.ticket(token);
    return api.wsUrl(ticket);
  });
  socket.onFrame((frame) => void handleFrame(frame, get));
}

async function handleFrame(frame: ServerFrame, get: () => KithState): Promise<void> {
  const state = get();
  if (frame.t === 'message') {
    const conv = state.conversations.find((c) => c.id === frame.conversationId);
    if (!conv) {
      await useKith.getState().hydrate();
    }
    try {
      const env = frame.envelope;
      let plaintext: string | null;
      if (env.type === 'group') {
        plaintext = state.userId ? await openGroupEnvelope(env, state.userId) : null;
      } else {
        plaintext = await openFrom(env);
      }
      if (plaintext == null) return;
      const content = decodeContent(plaintext);
      const text = content.t === 'text' ? content.body : `[${content.t}]`;
      useKith.setState((s) => addIncoming(s, frame.conversationId, frame.seq, frame.senderId, text, frame.createdAt));
      socket?.send({ t: 'delivered', conversationId: frame.conversationId, seq: frame.seq });
    } catch {
      // undecryptable
    }
  } else if (frame.t === 'sent') {
    useKith.setState((s) => applyAck(s, frame.clientId, frame.seq));
  } else if (frame.t === 'receipt') {
    useKith.setState((s) => applyReceipt(s, frame.conversationId, frame.seq, frame.kind));
  }
}

function addIncoming(s: KithState, convId: string, seq: number, senderId: string, text: string, createdAt: number): Partial<KithState> {
  const list = s.messages[convId] ?? [];
  if (list.some((m) => m.seq === seq)) return {};
  const msg: Message = { id: cid(), seq, senderId, text, mine: senderId === s.userId, at: createdAt, status: 'read' };
  return {
    messages: { ...s.messages, [convId]: [...list, msg] },
    conversations: s.conversations.map((c) => (c.id === convId ? { ...c, lastPreview: text, lastAt: createdAt, unread: s.activeId === convId ? 0 : c.unread + 1 } : c)),
  };
}

function applyAck(s: KithState, clientId: string, seq: number): Partial<KithState> {
  const messages: Record<string, Message[]> = {};
  for (const [k, list] of Object.entries(s.messages)) {
    messages[k] = list.map((m) => (m.clientId === clientId ? { ...m, seq, status: 'sent' } : m));
  }
  return { messages };
}

function applyReceipt(s: KithState, convId: string, seq: number, kind: 'delivered' | 'read'): Partial<KithState> {
  const list = s.messages[convId];
  if (!list) return {};
  return {
    messages: {
      ...s.messages,
      [convId]: list.map((m) => (m.mine && m.seq != null && m.seq <= seq && m.status !== 'read' ? { ...m, status: kind } : m)),
    },
  };
}

export const useKith = create<KithState & { hydrate: () => Promise<void> }>((set, get) => ({
  ready: false,
  token: null,
  userId: null,
  username: null,
  needsBackup: false,
  conversations: [],
  messages: {},
  activeId: null,
  error: null,

  ackBackup: () => set({ needsBackup: false }),

  hydrate: async () => {
    const token = get().token;
    if (!token) return;
    const { conversations } = await api.listConversations(token);
    set({
      conversations: conversations.map((c) => ({
        id: c.id,
        kind: c.kind,
        title: c.kind === 'group' ? (c.name ?? 'Group') : (c.peer?.displayName ?? 'Unknown'),
        peerUsername: c.kind === 'direct' ? c.peer?.username : undefined,
        members: c.members,
        unread: c.unreadCount,
        lastPreview: c.lastMessage ? 'Encrypted message' : '',
        lastAt: c.lastMessage?.createdAt ?? 0,
      })),
    });
  },

  restore: async () => {
    try {
      const stored = await loadSession();
      if (stored && (await hasIdentity())) {
        set({ token: stored.token, userId: stored.userId });
        connect(get);
        void get().hydrate();
        void socket?.connect();
        try {
          const { oneTimePreKeyCount } = await import('./crypto/e2e');
          const count = await oneTimePreKeyCount();
          if (count < 5) await api.replenish(stored.token, await replenishPreKeys(20));
        } catch {
          // best-effort prekey top-up
        }
      }
    } catch {
      // fall through to sign-in
    } finally {
      set({ ready: true });
    }
  },

  register: async (username, displayName) => {
    set({ error: null });
    const { bootstrapIdentity } = await import('./crypto/e2e');
    const material = await bootstrapIdentity();
    const session = await api.register({ username, displayName, ...material });
    await saveSession({ token: session.token, userId: session.userId, deviceId: session.deviceId });
    set({ token: session.token, userId: session.userId, username, needsBackup: true });
    connect(get);
    void socket?.connect();
    await get().hydrate();
  },

  login: async (username) => {
    set({ error: null });
    const { challenge } = await api.challenge(username);
    const signature = await signChallenge(challenge);
    const session = await api.verify({ username, challenge, signature });
    await saveSession({ token: session.token, userId: session.userId, deviceId: session.deviceId });
    set({ token: session.token, userId: session.userId, username });
    connect(get);
    void socket?.connect();
    await get().hydrate();
  },

  restoreWithPhrase: async (username, phrase) => {
    const { restoreFromPhrase } = await import('./crypto/e2e');
    const rotation = await restoreFromPhrase(phrase);
    const { challenge } = await api.challenge(username);
    const signature = await signChallenge(challenge);
    const session = await api.verify({ username, challenge, signature });
    await saveSession({ token: session.token, userId: session.userId, deviceId: session.deviceId });
    await api.rotateKeys(session.token, rotation);
    set({ token: session.token, userId: session.userId, username });
    connect(get);
    void socket?.connect();
    await get().hydrate();
  },

  select: async (conversationId) => {
    set((s) => ({ activeId: conversationId, conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)) }));
    const token = get().token;
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (!token || !conv) return;
    if (get().messages[conversationId]) {
      // still mark read on the server
    }
    try {
      const { messages } = await api.history(token, conversationId);
      const myId = get().userId;
      const loaded: Message[] = [];
      for (const dto of messages) {
        if (dto.senderId === myId) continue; // own sent were sealed to the peer
        if (dto.deleted) continue;
        try {
          const env = dto.envelope;
          const plaintext = env.type === 'group' ? (myId ? await openGroupEnvelope(env, myId) : null) : await openFrom(env);
          if (plaintext == null) continue;
          const content = decodeContent(plaintext);
          loaded.push({ id: cid(), seq: dto.seq, senderId: dto.senderId, text: content.t === 'text' ? content.body : `[${content.t}]`, mine: false, at: dto.createdAt, status: 'read' });
        } catch {
          // undecryptable
        }
      }
      const existing = get().messages[conversationId] ?? [];
      const seen = new Set(existing.map((m) => m.seq));
      const merged = [...existing, ...loaded.filter((m) => !seen.has(m.seq))].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
      set((s) => ({ messages: { ...s.messages, [conversationId]: merged } }));
      const highest = merged.reduce((max, m) => Math.max(max, m.seq ?? 0), 0);
      if (highest > 0) socket?.send({ t: 'read', conversationId, seq: highest });
    } catch {
      // history unavailable
    }
  },

  startChat: async (username) => {
    const token = get().token;
    if (!token) return;
    set({ error: null });
    try {
      const peer = await api.lookupUser(token, username);
      const direct = await api.createDirect(token, username);
      const existing = get().conversations.find((c) => c.id === direct.id);
      if (!existing) {
        set((s) => ({
          conversations: [
            { id: direct.id, kind: 'direct', title: peer.displayName, peerUsername: peer.username, members: [peer], unread: 0, lastPreview: '', lastAt: Date.now() },
            ...s.conversations,
          ],
        }));
      }
      await get().select(direct.id);
    } catch {
      set({ error: `No one is registered as @${username}.` });
    }
  },

  sendText: async (text) => {
    const trimmed = text.trim();
    const token = get().token;
    const convId = get().activeId;
    const conv = get().conversations.find((c) => c.id === convId);
    if (!trimmed || !token || !convId || !conv) return;
    const clientId = cid();
    const myId = get().userId!;
    const msg: Message = { id: cid(), clientId, senderId: myId, text: trimmed, mine: true, at: Date.now(), status: 'sending' };
    set((s) => ({
      messages: { ...s.messages, [convId]: [...(s.messages[convId] ?? []), msg] },
      conversations: s.conversations.map((c) => (c.id === convId ? { ...c, lastPreview: trimmed, lastAt: msg.at } : c)),
    }));
    const fail = () => set((s) => ({ messages: { ...s.messages, [convId]: (s.messages[convId] ?? []).map((m) => (m.clientId === clientId ? { ...m, status: 'failed' } : m)) } }));
    try {
      const envelope =
        conv.kind === 'group'
          ? await buildGroupEnvelope(
              encodeContent({ t: 'text', body: trimmed }),
              await Promise.all(conv.members.filter((m) => m.id !== myId).map(async (m) => ({ userId: m.id, bundle: await api.bundle(token, m.username) }))),
            )
          : await sealTo(await api.bundle(token, conv.peerUsername!), encodeContent({ t: 'text', body: trimmed }));
      if (!socket?.send({ t: 'send', conversationId: convId, clientId, envelope })) fail();
    } catch {
      fail();
    }
  },

  logout: async () => {
    socket?.close();
    socket = null;
    await clearAll();
    set({ token: null, userId: null, username: null, conversations: [], messages: {}, activeId: null });
  },
}));
