// End-to-end DB test against a REAL Postgres (PGlite, in-process WASM). Proves the migration
// applies, bytea round-trips exactly, the atomic one-time-prekey consume drains one-per-fetch to
// null, and a message sealed to a DB-fetched bundle opens with the recipient's held secrets.

import assert from 'node:assert/strict';
import { randomBytes as nodeRandomBytes } from 'node:crypto';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import {
  envelopeFromWire,
  envelopeToWire,
  generateIdentity,
  generateX25519,
  open,
  type PreKeyBundleBytes,
  type RecipientKeys,
  seal,
  type SenderIdentity,
  signPreKey,
} from '@kith/shared';
import { desc, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

import * as schema from './schema';
import { devices, oneTimePreKeys, signedPreKeys, users } from './schema';

const rnd = (n: number) => new Uint8Array(nodeRandomBytes(n));
const MIGRATIONS = fileURLToPath(new URL('../../drizzle', import.meta.url));

test('register -> bundle consume -> crypto, against real Postgres (PGlite)', async () => {
  const client = new PGlite();
  const db = drizzle(client, { schema, casing: 'snake_case' });
  await migrate(db, { migrationsFolder: MIGRATIONS });

  // Bob generates keys on-device; only PUBLIC material is uploaded.
  const bob = generateIdentity(rnd);
  const bobSpk = generateX25519(rnd);
  const bobSpkSig = signPreKey(bobSpk.pub, bob.ikSecret);
  const opkSecrets = new Map<string, Uint8Array>();
  const opkPublics = Array.from({ length: 3 }, (_, i) => {
    const k = generateX25519(rnd);
    const id = `opk-${i}`;
    opkSecrets.set(id, k.secret);
    return { id, pub: k.pub };
  });

  // Mirror /auth/register inserts.
  const [bobUser] = await db.insert(users).values({ username: 'bob', displayName: 'Bob' }).returning();
  assert.ok(bobUser);
  const [bobDevice] = await db.insert(devices).values({ userId: bobUser.id, ikPub: bob.ikPub, ikDhPub: bob.ikDhPub }).returning();
  assert.ok(bobDevice);
  await db.insert(signedPreKeys).values({ deviceId: bobDevice.id, keyId: 'spk-1', pub: bobSpk.pub, sig: bobSpkSig });
  await db.insert(oneTimePreKeys).values(opkPublics.map((k) => ({ deviceId: bobDevice.id, keyId: k.id, pub: k.pub })));

  async function fetchBundle(): Promise<PreKeyBundleBytes> {
    const [device] = await db.select().from(devices).where(eq(devices.id, bobDevice!.id)).limit(1);
    assert.ok(device);
    const [spk] = await db.select().from(signedPreKeys).where(eq(signedPreKeys.deviceId, device.id)).orderBy(desc(signedPreKeys.createdAt)).limit(1);
    assert.ok(spk);
    const oldest = db
      .select({ id: oneTimePreKeys.id })
      .from(oneTimePreKeys)
      .where(eq(oneTimePreKeys.deviceId, device.id))
      .orderBy(oneTimePreKeys.createdAt)
      .for('update', { skipLocked: true })
      .limit(1);
    const consumed = await db.delete(oneTimePreKeys).where(inArray(oneTimePreKeys.id, oldest)).returning({ keyId: oneTimePreKeys.keyId, pub: oneTimePreKeys.pub });
    const row = consumed[0];
    return {
      ikPub: device.ikPub,
      ikDhPub: device.ikDhPub,
      spkId: spk.keyId,
      spkPub: spk.pub,
      spkSig: spk.sig,
      opk: row ? { id: row.keyId, pub: row.pub } : null,
    };
  }

  // bytea round-trips exactly.
  const b1 = await fetchBundle();
  assert.deepEqual(b1.ikPub, bob.ikPub);
  assert.deepEqual(b1.spkPub, bobSpk.pub);
  assert.ok(b1.opk, 'first fetch consumes an opk');

  // Alice seals to the DB-fetched bundle; Bob opens with his held secrets.
  const alice = generateIdentity(rnd);
  const sender: SenderIdentity = { ikPub: alice.ikPub, ikDhPub: alice.ikDhPub, ikDhSecret: alice.ikDhSecret };
  const env = seal(new TextEncoder().encode('db-backed hello'), sender, b1, rnd);
  const recipient: RecipientKeys = {
    ikDhSecret: bob.ikDhSecret,
    spkSecret: (id) => (id === 'spk-1' ? bobSpk.secret : undefined),
    opkSecret: (id) => opkSecrets.get(id),
  };
  const opened = open(envelopeFromWire(envelopeToWire(env)), recipient);
  assert.equal(new TextDecoder().decode(opened), 'db-backed hello');

  // One-time prekeys are consumed one-per-fetch and drain to null.
  const b2 = await fetchBundle();
  const b3 = await fetchBundle();
  const b4 = await fetchBundle();
  assert.ok(b2.opk && b3.opk);
  assert.notEqual(b1.opk!.id, b2.opk!.id);
  assert.equal(b4.opk, null, 'opks exhausted -> null bundle opk');

  await client.close();
});

test('username unique index rejects duplicates', async () => {
  const client = new PGlite();
  const db = drizzle(client, { schema, casing: 'snake_case' });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  await db.insert(users).values({ username: 'ada', displayName: 'Ada' });
  await assert.rejects(db.insert(users).values({ username: 'ada', displayName: 'Ada 2' }));
  await client.close();
});
