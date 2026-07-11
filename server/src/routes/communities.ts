// Community REST: create a community (with its channels as group conversations) and list the
// caller's communities. Channel messaging happens over the socket like any group conversation.

import { CreateCommunityRequest } from '@kith/shared';
import { inArray } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db';
import { users } from '../db/schema';
import { createCommunity, listCommunities } from '../lib/communities';
import { requireAuth, type AuthEnv } from '../middleware/auth';

export const communitiesRoute = new Hono<AuthEnv>();
communitiesRoute.use('*', requireAuth);

communitiesRoute.get('/', async (c) => {
  return c.json({ communities: await listCommunities(c.get('session').userId) });
});

communitiesRoute.post('/', async (c) => {
  const parsed = CreateCommunityRequest.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid request' }, 400);
  const me = c.get('session').userId;
  const found = await db.select({ id: users.id }).from(users).where(inArray(users.username, parsed.data.usernames));
  if (found.length === 0) return c.json({ error: 'no known members' }, 404);
  const channelNames = parsed.data.channels && parsed.data.channels.length > 0 ? parsed.data.channels : ['general'];
  const community = await createCommunity(me, parsed.data.name.trim(), parsed.data.description?.trim() ?? null, found.map((u) => u.id), channelNames);
  return c.json(community);
});
