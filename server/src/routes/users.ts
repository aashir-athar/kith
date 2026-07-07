// User lookup: resolve a UUID or handle to a public profile, so the client can render real
// participants and start a chat with a real user.

import type { UserPublic } from '@kith/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db';
import { users } from '../db/schema';
import { requireAuth, type AuthEnv } from '../middleware/auth';

export const usersRoute = new Hono<AuthEnv>();
usersRoute.use('*', requireAuth);

const cols = { id: users.id, username: users.username, displayName: users.displayName };

usersRoute.get('/lookup/:username', async (c) => {
  const [user] = await db.select(cols).from(users).where(eq(users.username, c.req.param('username'))).limit(1);
  if (!user) return c.json({ error: 'unknown user' }, 404);
  return c.json(user satisfies UserPublic);
});

usersRoute.get('/:id', async (c) => {
  const [user] = await db.select(cols).from(users).where(eq(users.id, c.req.param('id'))).limit(1);
  if (!user) return c.json({ error: 'unknown user' }, 404);
  return c.json(user satisfies UserPublic);
});
