// Messaging service: the live send/receive path. Sending fetches the peer's prekey bundle, seals
// the plaintext, and emits a WS send frame. Receiving opens the envelope (always sealed to us),
// ensures the conversation exists locally, hands the plaintext up, and acks delivery. On every
// (re)connect it asks the app to resync missed messages. Plaintext exists only here and in the UI.

import { api } from '@/api/client';
import { KithSocket } from '@/api/socket';
import { openFrom, sealTo } from '@/crypto/e2e';
import { newId } from '@/lib/id';
import { decodeContent, encodeContent } from '@/net/content';
import type { ServerFrame } from '@kith/shared';

export interface IncomingMessage {
  conversationId: string;
  seq: number;
  senderId: string;
  text: string;
  createdAt: number;
}

export interface Handlers {
  ensureConversation: (serverConversationId: string, senderId: string) => Promise<void>;
  onIncoming: (msg: IncomingMessage) => void;
  onReaction: (info: { conversationId: string; targetSeq: number; key: string; remove: boolean; senderId: string }) => void;
  onPin: (info: { conversationId: string; targetSeq: number; pinned: boolean }) => void;
  onSent: (info: { clientId: string; conversationId: string; seq: number; id: string; createdAt: number }) => void;
  onReceipt: (info: { conversationId: string; seq: number; userId: string; kind: 'delivered' | 'read' }) => void;
  onEdited: (info: { conversationId: string; seq: number; text: string; editedAt: number }) => void;
  onDeleted: (info: { conversationId: string; seq: number }) => void;
  onConnect: () => void;
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
    this.socket.onOpen(() => this.handlers?.onConnect());
    void this.socket.connect();
  }

  private async handle(frame: ServerFrame): Promise<void> {
    if (!this.handlers) return;
    if (frame.t === 'message') {
      try {
        const content = decodeContent(await openFrom(frame.envelope));
        await this.handlers.ensureConversation(frame.conversationId, frame.senderId);
        if (content.t === 'reaction') {
          this.handlers.onReaction({ conversationId: frame.conversationId, targetSeq: content.targetSeq, key: content.key, remove: content.remove, senderId: frame.senderId });
        } else if (content.t === 'pin') {
          this.handlers.onPin({ conversationId: frame.conversationId, targetSeq: content.targetSeq, pinned: content.pinned });
        } else {
          this.handlers.onIncoming({ conversationId: frame.conversationId, seq: frame.seq, senderId: frame.senderId, text: content.body, createdAt: frame.createdAt });
        }
        this.socket?.send({ t: 'delivered', conversationId: frame.conversationId, seq: frame.seq });
      } catch {
        // undecryptable (not addressed to this device); skip
      }
    } else if (frame.t === 'sent') {
      this.handlers.onSent({ clientId: frame.clientId, conversationId: frame.conversationId, seq: frame.seq, id: frame.id, createdAt: frame.createdAt });
    } else if (frame.t === 'receipt') {
      this.handlers.onReceipt({ conversationId: frame.conversationId, seq: frame.seq, userId: frame.userId, kind: frame.kind });
    } else if (frame.t === 'edited') {
      try {
        const content = decodeContent(await openFrom(frame.envelope));
        const text = content.t === 'text' ? content.body : '';
        this.handlers.onEdited({ conversationId: frame.conversationId, seq: frame.seq, text, editedAt: frame.editedAt });
      } catch {
        // undecryptable edit; skip
      }
    } else if (frame.t === 'deleted') {
      this.handlers.onDeleted({ conversationId: frame.conversationId, seq: frame.seq });
    }
  }

  async sendText(conversationId: string, peerUsername: string, clientId: string, text: string): Promise<boolean> {
    if (!this.token || !this.socket) return false;
    const bundle = await api.bundle(this.token, peerUsername);
    const envelope = await sealTo(bundle, encodeContent({ t: 'text', body: text }));
    return this.socket.send({ t: 'send', conversationId, clientId, envelope });
  }

  /** Re-seal the new text and propagate an edit of the message at targetSeq. */
  async sendEdit(conversationId: string, peerUsername: string, targetSeq: number, newText: string): Promise<boolean> {
    if (!this.token || !this.socket) return false;
    const bundle = await api.bundle(this.token, peerUsername);
    const envelope = await sealTo(bundle, encodeContent({ t: 'text', body: newText }));
    return this.socket.send({ t: 'edit', conversationId, targetSeq, envelope });
  }

  /** A reaction and a pin ride the normal send path as sealed control content; the relay stores and
   * fans them out as opaque messages, and the peer applies them to the target by sequence. */
  async sendReaction(conversationId: string, peerUsername: string, targetSeq: number, key: string, remove: boolean): Promise<boolean> {
    if (!this.token || !this.socket) return false;
    const bundle = await api.bundle(this.token, peerUsername);
    const envelope = await sealTo(bundle, encodeContent({ t: 'reaction', targetSeq, key, remove }));
    return this.socket.send({ t: 'send', conversationId, clientId: newId(), envelope });
  }

  async sendPin(conversationId: string, peerUsername: string, targetSeq: number, pinned: boolean): Promise<boolean> {
    if (!this.token || !this.socket) return false;
    const bundle = await api.bundle(this.token, peerUsername);
    const envelope = await sealTo(bundle, encodeContent({ t: 'pin', targetSeq, pinned }));
    return this.socket.send({ t: 'send', conversationId, clientId: newId(), envelope });
  }

  /** Delete-for-everyone the message at targetSeq. */
  sendDelete(conversationId: string, targetSeq: number): boolean {
    return this.socket?.send({ t: 'delete', conversationId, targetSeq }) ?? false;
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
