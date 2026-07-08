// Verifies account erasure against Postgres (PGlite): the user, their device/prekeys, and their
// sent messages are gone, while the peer keeps the shared conversation (with its own participation).

import assert from 'node:assert/strict';
import { randomBytes as nodeRandomBytes } from 'node:crypto';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { type MessageEnvelope, toHex } from '@kith/shared';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

import type { Db } from '../db';
import * as schema from '../db/schema';
import { devices, oneTimePreKeys, signedPreKeys, users } from '../db/schema';
import { deleteAccount } from './account';
import { createOrGetDirect, listConversations } from './conversations';
import { persistMessage } from './messages';

const rnd = (n: number) => new Uint8Array(nodeRandomBytes(n));
const MIGRATIONS = fileURLToPath(new URL('../../drizzle', import.meta.url));

function envelope(text: string): MessageEnvelope {
  return {
    v: 1,
    type: 'prekey',
    senderIkPub: toHex(rnd(32)),
    senderIkDhPub: toHex(rnd(32)),
    ephemeralPub: toHex(rnd(32)),
    usedSpkId: 'spk-1',
    usedOpkId: null,
    nonce: toHex(rnd(24)),
    ciphertext: toHex(new TextEncoder().encode(text)),
  };
}

async function setup() {
  const client = new PGlite();
  const pdb = drizzle(client, { schema, casing: 'snake_case' });
  await migrate(pdb, { migrationsFolder: MIGRATIONS });
  const db = pdb as unknown as Db;
  const [alice] = await db.insert(users).values({ username: 'alice', displayName: 'Alice' }).returning();
  const [bob] = await db.insert(users).values({ username: 'bob', displayName: 'Bob' }).returning();
  const [aliceDevice] = await db.insert(devices).values({ userId: alice!.id, ikPub: rnd(32), ikDhPub: rnd(32) }).returning();
  await db.insert(signedPreKeys).values({ deviceId: aliceDevice!.id, keyId: 's1', pub: rnd(32), sig: rnd(64) });
  await db.insert(oneTimePreKeys).values({ deviceId: aliceDevice!.id, keyId: 'o1', pub: rnd(32) });
  return { client, db, alice: alice!, bob: bob!, aliceDevice: aliceDevice! };
}

test('deleteAccount erases the user, their device/prekeys, and their messages', async () => {
  const { client, db, alice, bob, aliceDevice } = await setup();
  const conv = await createOrGetDirect(alice.id, bob.id, db);
  await persistMessage({ conversationId: conv.id, senderUserId: alice.id, senderDeviceId: aliceDevice.id, envelope: envelope('hi bob') }, db);

  await deleteAccount(alice.id, db);

  assert.equal((await db.select().from(users).where(eq(users.id, alice.id))).length, 0, 'user row gone');
  assert.equal((await db.select().from(devices).where(eq(devices.userId, alice.id))).length, 0, 'devices cascaded');
  assert.equal((await db.select().from(signedPreKeys).where(eq(signedPreKeys.deviceId, aliceDevice.id))).length, 0, 'signed prekeys cascaded');
  assert.equal((await db.select().from(oneTimePreKeys).where(eq(oneTimePreKeys.deviceId, aliceDevice.id))).length, 0, 'one-time prekeys cascaded');

  // Bob still exists and keeps the conversation; his participation row survives.
  assert.equal((await db.select().from(users).where(eq(users.id, bob.id))).length, 1, 'peer untouched');
  const bobList = await listConversations(bob.id, db);
  assert.equal(bobList.length, 1, 'peer keeps the shared conversation');
  await client.close();
});

test('deleteAccount drops a conversation once no participant remains', async () => {
  const { client, db, alice, bob } = await setup();
  const conv = await createOrGetDirect(alice.id, bob.id, db);
  await deleteAccount(alice.id, db);
  await deleteAccount(bob.id, db);
  assert.equal((await db.select().from(schema.conversations).where(eq(schema.conversations.id, conv.id))).length, 0, 'orphaned conversation removed');
  await client.close();
});
