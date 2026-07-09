// Remote push, so a message reaches a device that is not connected (backgrounded or force-quit).
// The relay is zero-knowledge, so the push is content-free: it never carries message text, only a
// generic "New message" and the conversation id, which wakes the app to fetch and decrypt locally.
// Delivery rides Expo's push service (APNs on iOS, FCM on Android); credentials are managed by EAS.

import { eq, inArray } from 'drizzle-orm';

import { db as defaultDb, type Db } from '../db';
import { pushTokens } from '../db/schema';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: string;
  priority: 'high';
  data: Record<string, unknown>;
}

export interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

export type PushSender = (messages: ExpoPushMessage[]) => Promise<ExpoTicket[]>;

export async function registerPushToken(userId: string, token: string, platform: string | null, db: Db = defaultDb): Promise<void> {
  await db
    .insert(pushTokens)
    .values({ userId, token, platform })
    .onConflictDoUpdate({ target: pushTokens.token, set: { userId, platform } });
}

export async function removePushToken(token: string, db: Db = defaultDb): Promise<void> {
  await db.delete(pushTokens).where(eq(pushTokens.token, token));
}

export async function tokensForUsers(userIds: string[], db: Db = defaultDb): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await db.select({ token: pushTokens.token }).from(pushTokens).where(inArray(pushTokens.userId, userIds));
  return rows.map((r) => r.token);
}

/** POST the batch to Expo (chunked at the 100-message limit) and return the tickets in order. */
export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<ExpoTicket[]> {
  const tickets: ExpoTicket[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) continue;
    const body = (await res.json()) as { data?: ExpoTicket[] };
    if (Array.isArray(body.data)) tickets.push(...body.data);
  }
  return tickets;
}

/** Wake the given users with a content-free push, and prune tokens Expo reports as dead. */
export async function notifyNewMessage(
  userIds: string[],
  data: Record<string, unknown>,
  db: Db = defaultDb,
  send: PushSender = sendExpoPush,
): Promise<void> {
  const tokens = await tokensForUsers(userIds, db);
  if (tokens.length === 0) return;
  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    title: 'Kith',
    body: 'New message',
    sound: 'default',
    channelId: 'messages',
    priority: 'high',
    data,
  }));
  const tickets = await send(messages);
  const dead = tokens.filter((_, i) => tickets[i]?.status === 'error' && tickets[i]?.details?.error === 'DeviceNotRegistered');
  await Promise.all(dead.map((t) => removePushToken(t, db)));
}
