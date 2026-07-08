// Realtime socket client. Mints a fresh single-use ticket, opens the WebSocket, validates every
// inbound frame against the shared schema, and reconnects with capped backoff. Callers subscribe
// to typed server frames and send typed client frames.

import { type ClientFrame, ServerFrame } from '@kith/shared';

type Handler = (frame: ServerFrame) => void;

export class KithSocket {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private openHandlers = new Set<() => void>();
  private closed = false;
  private backoff = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private ticketUrl: () => Promise<string>) {}

  onFrame(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onOpen(handler: () => void): () => void {
    this.openHandlers.add(handler);
    return () => this.openHandlers.delete(handler);
  }

  async connect(): Promise<void> {
    this.closed = false;
    let url: string;
    try {
      url = await this.ticketUrl();
    } catch {
      this.scheduleReconnect();
      return;
    }
    const ws = new WebSocket(url);
    this.ws = ws;
    ws.onopen = () => {
      this.backoff = 1000;
      for (const handler of this.openHandlers) handler();
    };
    ws.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const parsed = ServerFrame.safeParse(JSON.parse(event.data));
        if (parsed.success) for (const handler of this.handlers) handler(parsed.data);
      } catch {
        // ignore malformed frames
      }
    };
    ws.onclose = () => {
      if (!this.closed) this.scheduleReconnect();
    };
    ws.onerror = () => {
      ws.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closed) void this.connect();
    }, this.backoff);
    this.backoff = Math.min(this.backoff * 2, 15000);
  }

  send(frame: ClientFrame): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
      return true;
    }
    return false;
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.handlers.clear();
    this.openHandlers.clear();
    this.ws?.close();
    this.ws = null;
  }
}
