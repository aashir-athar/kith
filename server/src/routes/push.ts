// Push-token registration. Authenticated: a device registers its Expo push token so the relay can
// wake it when it is not connected, and drops it on sign-out. The token is a public routing handle.

import { PushRegisterRequest } from '@kith/shared';
import { Hono } from 'hono';

import { registerPushToken, removePushToken } from '../lib/push';
import { requireAuth, type AuthEnv } from '../middleware/auth';

export const push = new Hono<AuthEnv>();
push.use('*', requireAuth);

push.post('/register', async (c) => {
  const parsed = PushRegisterRequest.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid request' }, 400);
  const { userId } = c.get('session');
  await registerPushToken(userId, parsed.data.token, parsed.data.platform ?? null);
  return c.json({ ok: true });
});

push.post('/unregister', async (c) => {
  const parsed = PushRegisterRequest.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid request' }, 400);
  await removePushToken(parsed.data.token);
  return c.json({ ok: true });
});
