// Opaque, revocable sessions and single-use realtime tickets, both in Redis.

import { env } from '../env';
import { redis } from '../redis';
import { token } from './ids';

export interface Session {
  userId: string;
  deviceId: string;
}

const sessionKey = (t: string) => `session:${t}`;
const ticketKey = (t: string) => `rt:${t}`;

export async function createSession(s: Session): Promise<{ token: string; expiresAt: number }> {
  const t = token();
  await redis.set(sessionKey(t), JSON.stringify(s), 'EX', env.SESSION_TTL_SECONDS);
  return { token: t, expiresAt: Date.now() + env.SESSION_TTL_SECONDS * 1000 };
}

export async function getSession(t: string): Promise<Session | null> {
  const raw = await redis.get(sessionKey(t));
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function revokeSession(t: string): Promise<void> {
  await redis.del(sessionKey(t));
}

/** Mint a short-lived, single-use ticket the client redeems at the WS upgrade. */
export async function mintTicket(s: Session): Promise<{ ticket: string; expiresAt: number }> {
  const t = token(24);
  await redis.set(ticketKey(t), JSON.stringify(s), 'EX', env.TICKET_TTL_SECONDS);
  return { ticket: t, expiresAt: Date.now() + env.TICKET_TTL_SECONDS * 1000 };
}

/** Redeem a ticket exactly once (GETDEL burns it, so a leaked URL is already spent). */
export async function redeemTicket(t: string): Promise<Session | null> {
  const raw = await redis.getdel(ticketKey(t));
  return raw ? (JSON.parse(raw) as Session) : null;
}
