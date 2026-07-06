// Bridges the messaging service to the stores. When a backend is configured, it restores the
// saved session and, once a token exists, connects the socket and routes inbound frames into the
// chat store. When no backend is configured it is inert, so the mock app runs untouched.

import { type ReactNode, useEffect } from 'react';

import { BACKEND_ENABLED } from '@/net/config';
import { messaging } from '@/net/messaging';
import { useChatStore } from '@/stores/useChatStore';
import { useSessionStore } from '@/stores/useSessionStore';

export function MessagingProvider({ children }: { children: ReactNode }) {
  const token = useSessionStore((s) => s.serverToken);
  const restoreServerSession = useSessionStore((s) => s.restoreServerSession);

  useEffect(() => {
    if (BACKEND_ENABLED) void restoreServerSession();
  }, [restoreServerSession]);

  useEffect(() => {
    if (!BACKEND_ENABLED || !token) return;
    messaging.init(token, {
      onIncoming: (m) =>
        useChatStore.getState().receiveServerMessage({ serverConversationId: m.conversationId, seq: m.seq, senderId: m.senderId, text: m.text, createdAt: m.createdAt }),
      onSent: (a) => useChatStore.getState().applySentAck({ clientId: a.clientId, seq: a.seq, id: a.id }),
      onReceipt: () => undefined,
    });
    return () => messaging.disconnect();
  }, [token]);

  return <>{children}</>;
}
