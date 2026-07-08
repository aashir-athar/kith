// Account deletion. Authenticated right-to-erasure: the caller can only delete their own account,
// identified by the session, and the work is done in lib/account so it stays testable.

import { Hono } from 'hono';

import { deleteAccount } from '../lib/account';
import { requireAuth, type AuthEnv } from '../middleware/auth';

export const account = new Hono<AuthEnv>();
account.use('*', requireAuth);

account.delete('/', async (c) => {
  const { userId } = c.get('session');
  await deleteAccount(userId);
  return c.json({ ok: true });
});
