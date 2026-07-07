// Realtime gateway. Authenticates the socket by redeeming a single-use ticket at upgrade, then
// runs a persist-then-ack loop: every send is stored (monotonic seq) before the sender is acked,
// and fanned out to the other participants' devices via per-user Redis channels so it works
// across gateway instances. Receipts, typing, and reconnect-sync ride the same path.

import { upgradeWebSocket } from '@hono/node-server';
import { ClientFrame, type ServerFrame } from '@kith/shared';
import type { WSContext } from 'hono/ws';
import { WebSocketServer } from 'ws';

import { redeemTicket, type Session } from './lib/session';
import { participantIds } from './lib/conversations';
import { advanceCursor, isParticipant, persistMessage, syncAfter } from './lib/messages';
import { redis, redisSub } from './redis';

/** ws server handed to serve({ websocket: { server } }); also used for heartbeats. */
export const wss = new WebSocketServer({ noServer: true });

interface Conn {
  ws: WSContext;
  session: Session;
}

const connsByUser = new Map<string, Set<Conn>>();
const userSubCount = new Map<string, number>();

const userChannel = (userId: string) => `user:${userId}`;
const presenceKey = (userId: string) => `presence:${userId}`;
const J = (frame: ServerFrame) => JSON.stringify(frame);

// Single subscriber dispatch: deliver a fanned-out frame to this instance's local sockets.
redisSub.on('message', (channel, payload) => {
  if (!channel.startsWith('user:')) return;
  const set = connsByUser.get(channel.slice('user:'.length));
  if (!set) return;
  for (const conn of set) {
    const raw = conn.ws.raw as { bufferedAmount?: number } | undefined;
    if (raw && (raw.bufferedAmount ?? 0) > 1_000_000) continue; // slow consumer: drop, it resyncs on reconnect
    conn.ws.send(payload);
  }
});

function register(conn: Conn): void {
  const set = connsByUser.get(conn.session.userId) ?? new Set<Conn>();
  set.add(conn);
  connsByUser.set(conn.session.userId, set);
  const next = (userSubCount.get(conn.session.userId) ?? 0) + 1;
  userSubCount.set(conn.session.userId, next);
  if (next === 1) void redisSub.subscribe(userChannel(conn.session.userId));
  void redis.set(presenceKey(conn.session.userId), '1', 'EX', 60);
}

function unregister(conn: Conn): void {
  const set = connsByUser.get(conn.session.userId);
  if (set) {
    set.delete(conn);
    if (set.size === 0) connsByUser.delete(conn.session.userId);
  }
  const next = (userSubCount.get(conn.session.userId) ?? 1) - 1;
  if (next <= 0) {
    userSubCount.delete(conn.session.userId);
    void redisSub.unsubscribe(userChannel(conn.session.userId));
    void redis.del(presenceKey(conn.session.userId));
  } else {
    userSubCount.set(conn.session.userId, next);
  }
}

async function publishToOthers(conversationId: string, exceptUserId: string, frame: ServerFrame): Promise<void> {
  const others = (await participantIds(conversationId)).filter((p) => p !== exceptUserId);
  await Promise.all(others.map((p) => redis.publish(userChannel(p), J(frame))));
}

async function handleFrame(conn: Conn, raw: string): Promise<void> {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return;
  }
  const parsed = ClientFrame.safeParse(json);
  if (!parsed.success) {
    conn.ws.send(J({ t: 'error', message: 'malformed frame' }));
    return;
  }
  const frame = parsed.data;
  const { userId, deviceId } = conn.session;

  switch (frame.t) {
    case 'ping':
      conn.ws.send(J({ t: 'pong' }));
      return;

    case 'send': {
      if (!(await isParticipant(frame.conversationId, userId))) {
        conn.ws.send(J({ t: 'error', message: 'not a participant' }));
        return;
      }
      const rec = await persistMessage({ conversationId: frame.conversationId, senderUserId: userId, senderDeviceId: deviceId, envelope: frame.envelope });
      conn.ws.send(J({ t: 'sent', clientId: frame.clientId, id: rec.id, conversationId: rec.conversationId, seq: rec.seq, createdAt: rec.createdAt }));
      await publishToOthers(frame.conversationId, userId, {
        t: 'message',
        conversationId: rec.conversationId,
        seq: rec.seq,
        id: rec.id,
        senderId: userId,
        envelope: rec.envelope,
        createdAt: rec.createdAt,
      });
      return;
    }

    case 'delivered':
    case 'read': {
      await advanceCursor(frame.conversationId, userId, frame.t, frame.seq);
      await publishToOthers(frame.conversationId, userId, { t: 'receipt', conversationId: frame.conversationId, seq: frame.seq, userId, kind: frame.t });
      return;
    }

    case 'typing': {
      await publishToOthers(frame.conversationId, userId, { t: 'typing', conversationId: frame.conversationId, userId });
      return;
    }

    case 'sync': {
      const missed = await syncAfter(frame.conversationId, frame.afterSeq);
      for (const m of missed) {
        conn.ws.send(J({ t: 'message', conversationId: m.conversationId, seq: m.seq, id: m.id, senderId: m.senderId, envelope: m.envelope, createdAt: m.createdAt }));
      }
      return;
    }
  }
}

export const wsRoute = upgradeWebSocket(async (c) => {
  const ticket = c.req.query('ticket');
  const session = ticket ? await redeemTicket(ticket) : null;
  if (!session) {
    return { onOpen: (_evt, ws) => ws.close(1008, 'unauthorized') };
  }
  let conn: Conn | null = null;
  return {
    onOpen: (_evt, ws) => {
      conn = { ws, session };
      register(conn);
    },
    onMessage: async (evt) => {
      if (!conn) return;
      const data = evt.data;
      await handleFrame(conn, typeof data === 'string' ? data : data.toString());
    },
    onClose: () => {
      if (conn) unregister(conn);
    },
    onError: () => {
      if (conn) unregister(conn);
    },
  };
});

/** ws-level ping/pong: detects half-open TCP connections that never fire onClose. */
export function startHeartbeat(): NodeJS.Timeout {
  wss.on('connection', (socket) => {
    (socket as { isAlive?: boolean }).isAlive = true;
    socket.on('pong', () => {
      (socket as { isAlive?: boolean }).isAlive = true;
    });
  });
  return setInterval(() => {
    for (const socket of wss.clients) {
      const s = socket as typeof socket & { isAlive?: boolean };
      if (s.isAlive === false) {
        socket.terminate();
        continue;
      }
      s.isAlive = false;
      socket.ping();
    }
  }, 30_000);
}
