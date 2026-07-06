// Passwordless, key-based auth. Registration uploads only public key material (identity keys +
// prekeys); the server verifies the signed-prekey signature before trusting anything. Login is
// a challenge the client signs with its Ed25519 identity key.

import { AuthChallengeRequest, AuthVerifyRequest, fromHex, RegisterRequest, verifyBytes, verifySignedPreKey } from '@kith/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';

import { db } from '../db';
import { devices, oneTimePreKeys, signedPreKeys, users } from '../db/schema';
import { consumeChallenge, createChallenge } from '../lib/challenge';
import { createSession } from '../lib/session';

export const auth = new Hono();

auth.post('/register', async (c) => {
  const parsed = RegisterRequest.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid request' }, 400);
  const req = parsed.data;

  // Trust nothing until the signed prekey verifies against the claimed identity key.
  if (!verifySignedPreKey(fromHex(req.spk.pub), fromHex(req.spk.sig), fromHex(req.ikPub))) {
    return c.json({ error: 'bad signed prekey signature' }, 400);
  }

  const taken = await db.select({ id: users.id }).from(users).where(eq(users.username, req.username)).limit(1);
  if (taken.length > 0) return c.json({ error: 'username taken' }, 409);

  const created = await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ username: req.username, displayName: req.displayName }).returning();
    if (!user) throw new Error('user insert failed');
    const [device] = await tx
      .insert(devices)
      .values({ userId: user.id, ikPub: fromHex(req.ikPub), ikDhPub: fromHex(req.ikDhPub) })
      .returning();
    if (!device) throw new Error('device insert failed');
    await tx.insert(signedPreKeys).values({ deviceId: device.id, keyId: req.spk.id, pub: fromHex(req.spk.pub), sig: fromHex(req.spk.sig) });
    await tx.insert(oneTimePreKeys).values(req.oneTimePreKeys.map((k) => ({ deviceId: device.id, keyId: k.id, pub: fromHex(k.pub) })));
    return { userId: user.id, deviceId: device.id };
  });

  const session = await createSession(created);
  return c.json({ token: session.token, userId: created.userId, deviceId: created.deviceId, expiresAt: session.expiresAt });
});

auth.post('/challenge', async (c) => {
  const parsed = AuthChallengeRequest.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid request' }, 400);
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.username, parsed.data.username)).limit(1);
  if (!user) return c.json({ error: 'unknown user' }, 404);
  return c.json(await createChallenge(parsed.data.username));
});

auth.post('/verify', async (c) => {
  const parsed = AuthVerifyRequest.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid request' }, 400);
  const { username, challenge, signature } = parsed.data;

  if (!(await consumeChallenge(challenge, username))) return c.json({ error: 'invalid or expired challenge' }, 401);

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) return c.json({ error: 'unknown user' }, 404);
  const [device] = await db.select().from(devices).where(eq(devices.userId, user.id)).limit(1);
  if (!device) return c.json({ error: 'no device' }, 404);

  const ok = verifyBytes(new TextEncoder().encode(challenge), fromHex(signature), device.ikPub);
  if (!ok) return c.json({ error: 'signature does not match identity key' }, 401);

  const session = await createSession({ userId: user.id, deviceId: device.id });
  return c.json({ token: session.token, userId: user.id, deviceId: device.id, expiresAt: session.expiresAt });
});
