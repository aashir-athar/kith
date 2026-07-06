// Messaging service: the live send/receive path. Bridges the socket + crypto to the app. Sending
// fetches the peer's prekey bundle, seals the plaintext, and emits a WS send frame. Receiving
// opens the envelope, hands the plaintext up, and acks delivery. Plaintext exists only here and
// in the UI, never on the wire.

import { api } from '@/api/client';
import { KithSocket } from '@/api/socket';
import { openFrom, sealTo } from '@/crypto/e2e';
import type { ServerFrame } from '@kith/shared';

export interface IncomingMessage {
  conversationId: string;
  seq: number;
  senderId: string;
  text: string;
  createdAt: number;
}

export interface Handlers {
  onIncoming: (msg: IncomingMessage) => void;
  onSent: (info: { clientId: string; conversationId: string; seq: number; id: string; createdAt: number }) => void;
  onReceipt: (info: { conversationId: string; seq: number; userId: string; kind: 'delivered' | 'read' }) => void;
}

class Messaging {
  private socket: KithSocket | null = null;
  private token: string | null = null;
  private handlers: Handlers | null = null;

  init(token: string, handlers: Handlers): void {
    if (this.socket) this.disconnect();
    this.token = token;
    this.handlers = handlers;
    this.socket = new KithSocket(async () => {
      const { ticket } = await api.ticket(token);
      return api.wsUrl(ticket);
    });
    this.socket.onFrame((frame) => void this.handle(frame));
    void this.socket.connect();
  }

  private async handle(frame: ServerFrame): Promise<void> {
    if (!this.handlers) return;
    if (frame.t === 'message') {
      try {
        const text = await openFrom(frame.envelope);
        this.handlers.onIncoming({ conversationId: frame.conversationId, seq: frame.seq, senderId: frame.senderId, text, createdAt: frame.createdAt });
        this.socket?.send({ t: 'delivered', conversationId: frame.conversationId, seq: frame.seq });
      } catch {
        // undecryptable (e.g. not addressed to this device); skip
      }
    } else if (frame.t === 'sent') {
      this.handlers.onSent({ clientId: frame.clientId, conversationId: frame.conversationId, seq: frame.seq, id: frame.id, createdAt: frame.createdAt });
    } else if (frame.t === 'receipt') {
      this.handlers.onReceipt({ conversationId: frame.conversationId, seq: frame.seq, userId: frame.userId, kind: frame.kind });
    }
  }

  /** Seal to the peer's bundle and emit a send frame. Returns false if not connected. */
  async sendText(conversationId: string, peerUsername: string, clientId: string, text: string): Promise<boolean> {
    if (!this.token || !this.socket) return false;
    const bundle = await api.bundle(this.token, peerUsername);
    const envelope = await sealTo(bundle, text);
    return this.socket.send({ t: 'send', conversationId, clientId, envelope });
  }

  markRead(conversationId: string, seq: number): void {
    this.socket?.send({ t: 'read', conversationId, seq });
  }

  sync(conversationId: string, afterSeq: number): void {
    this.socket?.send({ t: 'sync', conversationId, afterSeq });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.token = null;
    this.handlers = null;
  }
}

export const messaging = new Messaging();
