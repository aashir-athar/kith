// Conversation REST: resolve-or-create a direct chat, and page message history. Real-time send
// happens over the socket; this is for starting a thread and back-filling history.

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { inArray } from 'drizzle-orm';

import { db } from '../db';
import { users } from '../db/schema';
import { listBlockedIds } from '../lib/blocks';
import { createGroup, createOrGetDirect, listConversations, participantIds, setMuted } from '../lib/conversations';
import { history, isParticipant } from '../lib/messages';
import { requireAuth, type AuthEnv } from '../middleware/auth';

export const conversationsRoute = new Hono<AuthEnv>();
conversationsRoute.use('*', requireAuth);

conversationsRoute.get('/', async (c) => {
  return c.json({ conversations: await listConversations(c.get('session').userId) });
});

conversationsRoute.post('/direct', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { username?: unknown } | null;
  const username = typeof body?.username === 'string' ? body.username : null;
  if (!username) return c.json({ error: 'invalid request' }, 400);
  const me = c.get('session').userId;
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (!target) return c.json({ error: 'unknown user' }, 404);
  if (target.id === me) return c.json({ error: 'cannot message yourself' }, 400);
  const conv = await createOrGetDirect(me, target.id);
  return c.json({ id: conv.id, kind: conv.kind, participants: await participantIds(conv.id) });
});

conversationsRoute.post('/group', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { name?: unknown; usernames?: unknown } | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const usernames = Array.isArray(body?.usernames) ? body.usernames.filter((u): u is string => typeof u === 'string') : [];
  if (name.length === 0 || usernames.length === 0) return c.json({ error: 'invalid request' }, 400);
  const me = c.get('session').userId;
  const found = await db.select({ id: users.id, username: users.username, displayName: users.displayName }).from(users).where(inArray(users.username, usernames));
  if (found.length === 0) return c.json({ error: 'no known members' }, 404);
  const conv = await createGroup(
    me,
    name,
    found.map((u) => u.id),
  );
  const [meRow] = await db.select({ id: users.id, username: users.username, displayName: users.displayName }).from(users).where(eq(users.id, me)).limit(1);
  const participants = [...(meRow ? [meRow] : []), ...found];
  return c.json({ id: conv.id, kind: conv.kind, name: conv.name, participants });
});

conversationsRoute.get('/:id/messages', async (c) => {
  const conversationId = c.req.param('id');
  const me = c.get('session').userId;
  if (!(await isParticipant(conversationId, me))) return c.json({ error: 'forbidden' }, 403);
  const beforeParam = c.req.query('before');
  const before = beforeParam !== undefined && Number.isFinite(Number(beforeParam)) ? Number(beforeParam) : null;
  // Exclude messages from anyone the reader has blocked, so a blocked sender never reaches history.
  const blocked = await listBlockedIds(me);
  return c.json({ messages: await history(conversationId, before, 50, db, blocked) });
});

conversationsRoute.post('/:id/mute', async (c) => {
  const conversationId = c.req.param('id');
  const me = c.get('session').userId;
  if (!(await isParticipant(conversationId, me))) return c.json({ error: 'forbidden' }, 403);
  const body = (await c.req.json().catch(() => null)) as { muted?: unknown } | null;
  if (typeof body?.muted !== 'boolean') return c.json({ error: 'invalid request' }, 400);
  await setMuted(conversationId, me, body.muted);
  return c.json({ ok: true });
});
