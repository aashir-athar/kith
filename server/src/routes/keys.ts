// Prekey distribution. A sender fetches a recipient's bundle to start a session; the server
// consumes exactly one one-time prekey per fetch (atomic, race-free) and degrades to opk=null
// when exhausted. Clients replenish their one-time prekeys periodically.

import { fromHex, PreKeyBundle, ReplenishPreKeysRequest, toHex } from '@kith/shared';
import { desc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db';
import { devices, oneTimePreKeys, signedPreKeys, users } from '../db/schema';
import { requireAuth, type AuthEnv } from '../middleware/auth';

export const keys = new Hono<AuthEnv>();
keys.use('*', requireAuth);

keys.get('/bundle/:username', async (c) => {
  const username = c.req.param('username');
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (!user) return c.json({ error: 'unknown user' }, 404);
  const [device] = await db.select().from(devices).where(eq(devices.userId, user.id)).limit(1);
  if (!device) return c.json({ error: 'no device' }, 404);
  const [spk] = await db
    .select()
    .from(signedPreKeys)
    .where(eq(signedPreKeys.deviceId, device.id))
    .orderBy(desc(signedPreKeys.createdAt))
    .limit(1);
  if (!spk) return c.json({ error: 'no signed prekey' }, 404);

  // Consume one one-time prekey atomically: FOR UPDATE SKIP LOCKED in the subquery gives
  // exactly-once delivery across concurrent bundle fetches. Expressed in Drizzle so it runs on
  // any driver.
  const oldest = db
    .select({ id: oneTimePreKeys.id })
    .from(oneTimePreKeys)
    .where(eq(oneTimePreKeys.deviceId, device.id))
    .orderBy(oneTimePreKeys.createdAt)
    .for('update', { skipLocked: true })
    .limit(1);
  const consumed = await db
    .delete(oneTimePreKeys)
    .where(inArray(oneTimePreKeys.id, oldest))
    .returning({ keyId: oneTimePreKeys.keyId, pub: oneTimePreKeys.pub });
  const opkRow = consumed[0];
  const opk = opkRow ? { id: opkRow.keyId, pub: toHex(opkRow.pub) } : null;

  const bundle = {
    ikPub: toHex(device.ikPub),
    ikDhPub: toHex(device.ikDhPub),
    spk: { id: spk.keyId, pub: toHex(spk.pub), sig: toHex(spk.sig) },
    opk,
  };
  return c.json(PreKeyBundle.parse(bundle));
});

keys.post('/replenish', async (c) => {
  const parsed = ReplenishPreKeysRequest.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid request' }, 400);
  const { deviceId } = c.get('session');
  await db.insert(oneTimePreKeys).values(parsed.data.oneTimePreKeys.map((k) => ({ deviceId, keyId: k.id, pub: fromHex(k.pub) })));
  return c.json({ ok: true });
});
