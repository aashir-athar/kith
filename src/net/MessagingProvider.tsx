// Bridges the messaging service to the stores. On a restored/new session it hydrates the chat
// list from the server, tops up one-time prekeys if low, connects the socket, and routes inbound
// frames (messages, receipts) into the chat store; on every (re)connect it resyncs missed
// messages. Inert when no backend is configured, so the mock app runs untouched.

import { type ReactNode, useEffect } from 'react';

import { api } from '@/api/client';
import { oneTimePreKeyCount, replenishPreKeys } from '@/crypto/e2e';
import { BACKEND_ENABLED } from '@/net/config';
import { messaging } from '@/net/messaging';
import { addNotificationTapHandler, registerForPush } from '@/net/push';
import { useChatStore } from '@/stores/useChatStore';
import { useCommunityStore } from '@/stores/useCommunityStore';
import { useSessionStore } from '@/stores/useSessionStore';

async function topUpPreKeys(token: string): Promise<void> {
  try {
    if ((await oneTimePreKeyCount()) < 5) {
      await api.replenish(token, await replenishPreKeys(20));
    }
  } catch {
    // best-effort; the server degrades to opk=null when exhausted
  }
}

export function MessagingProvider({ children }: { children: ReactNode }) {
  const token = useSessionStore((s) => s.serverToken);
  const restoreServerSession = useSessionStore((s) => s.restoreServerSession);

  useEffect(() => {
    if (BACKEND_ENABLED) void restoreServerSession();
  }, [restoreServerSession]);

  // Route a tapped message notification to its conversation. Set up once; cleaned up on unmount.
  useEffect(() => {
    if (!BACKEND_ENABLED) return;
    return addNotificationTapHandler((serverId) => useChatStore.getState().conversations.find((c) => c.serverId === serverId)?.id);
  }, []);

  // Remove disappearing messages whose timer has passed, on a steady cadence.
  useEffect(() => {
    const sweep = () => useChatStore.getState().sweepExpired();
    sweep();
    const timer = setInterval(sweep, 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!BACKEND_ENABLED || !token) return;
    const chat = useChatStore.getState();
    void chat.hydrateFromServer();
    void useCommunityStore.getState().hydrateCommunities();
    void topUpPreKeys(token);
    void registerForPush(token);
    messaging.init(token, {
      ensureConversation: (serverConvId) => useChatStore.getState().ensureServerConversation(serverConvId),
      onIncoming: (m) =>
        useChatStore.getState().receiveServerMessage({ serverConversationId: m.conversationId, seq: m.seq, senderId: m.senderId, content: m.content, createdAt: m.createdAt, expiresInSec: m.expiresInSec }),
      onReaction: (r) => useChatStore.getState().applyRemoteReaction({ serverConversationId: r.conversationId, targetSeq: r.targetSeq, key: r.key, remove: r.remove, senderId: r.senderId }),
      onPin: (p) => useChatStore.getState().applyRemotePin({ serverConversationId: p.conversationId, targetSeq: p.targetSeq, pinned: p.pinned }),
      onTimer: (t) => useChatStore.getState().applyTimer({ serverConversationId: t.conversationId, seconds: t.seconds }),
      onSent: (a) => useChatStore.getState().applySentAck({ clientId: a.clientId, seq: a.seq, id: a.id }),
      onReceipt: (r) => useChatStore.getState().applyReceipt(r),
      onEdited: (e) => useChatStore.getState().applyEdited(e),
      onDeleted: (d) => useChatStore.getState().applyDeleted(d),
      onConnect: () => useChatStore.getState().syncAll(),
    });
    return () => messaging.disconnect();
  }, [token]);

  return <>{children}</>;
}
