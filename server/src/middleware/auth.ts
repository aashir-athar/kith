import { createMiddleware } from 'hono/factory';

import { getSession, type Session } from '../lib/session';

export type AuthEnv = { Variables: { session: Session } };

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  const t = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!t) return c.json({ error: 'unauthorized' }, 401);
  const session = await getSession(t);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  c.set('session', session);
  await next();
});
