// Block management. Authenticated: block or unblock by username, and list who you have blocked.
// Enforcement lives in the gateway (delivery) and history/sync (reads); this only records intent.

import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';

import { db } from '../db';
import { users } from '../db/schema';
import { blockUser, listBlockedPublic, unblockUser } from '../lib/blocks';
import { requireAuth, type AuthEnv } from '../middleware/auth';

const Body = z.object({ username: z.string().min(1).max(32) });

export const blocksRoute = new Hono<AuthEnv>();
blocksRoute.use('*', requireAuth);

async function resolveUserId(username: string): Promise<string | null> {
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  return u?.id ?? null;
}

blocksRoute.get('/', async (c) => {
  return c.json({ blocked: await listBlockedPublic(c.get('session').userId) });
});

blocksRoute.post('/block', async (c) => {
  const parsed = Body.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid request' }, 400);
  const { userId } = c.get('session');
  const target = await resolveUserId(parsed.data.username);
  if (!target) return c.json({ error: 'unknown user' }, 404);
  if (target === userId) return c.json({ error: 'cannot block yourself' }, 400);
  await blockUser(userId, target);
  return c.json({ ok: true });
});

blocksRoute.post('/unblock', async (c) => {
  const parsed = Body.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid request' }, 400);
  const { userId } = c.get('session');
  const target = await resolveUserId(parsed.data.username);
  if (!target) return c.json({ error: 'unknown user' }, 404);
  await unblockUser(userId, target);
  return c.json({ ok: true });
});
