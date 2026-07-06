// Local-first chat state. Optimistic send: the bubble appears immediately as "sending", then
// the mock transport advances it to sent/delivered. The real MessageTransport will drive
// these same transitions, so screens never change when the backend lands.

import { create } from 'zustand';

import { newId } from '@/lib/id';
import { conversations as seedConversations, me, messagesByConversation as seedMessages } from '@/lib/mockData';
import type { Conversation, DeliveryStatus, Message } from '@/types/models';

interface ChatState {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  sendText: (conversationId: string, text: string) => void;
  markRead: (conversationId: string) => void;
  togglePin: (conversationId: string) => void;
}

function setStatus(list: Message[] | undefined, id: string, status: DeliveryStatus): Message[] {
  return (list ?? []).map((m) => (m.id === id ? { ...m, status } : m));
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: seedConversations,
  messages: seedMessages,

  sendText: (conversationId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = newId();
    const createdAt = new Date().toISOString();
    const message: Message = {
      id,
      conversationId,
      senderId: me.id,
      kind: 'text',
      text: trimmed,
      createdAt,
      status: 'sending',
    };

    set((state) => ({
      messages: { ...state.messages, [conversationId]: [...(state.messages[conversationId] ?? []), message] },
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, lastMessagePreview: trimmed, lastMessageAt: createdAt } : c,
      ),
    }));

    const advance = (status: DeliveryStatus, delay: number) =>
      setTimeout(() => {
        set((state) => ({
          messages: { ...state.messages, [conversationId]: setStatus(state.messages[conversationId], id, status) },
        }));
      }, delay);

    advance('sent', 350);
    advance('delivered', 850);
  },

  markRead: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    })),

  togglePin: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === conversationId ? { ...c, pinned: !c.pinned } : c)),
    })),
}));
