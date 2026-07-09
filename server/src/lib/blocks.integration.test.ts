// Verifies block enforcement against Postgres (PGlite): a reader's blocked senders are excluded
// from history, blockersAmong reports who blocked a sender (for the gateway's delivery filter), and
// the public list drives the client's blocked-users screen. Unblocking reverses all of it.

import assert from 'node:assert/strict';
import { randomBytes as nodeRandomBytes } from 'node:crypto';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { type MessageEnvelope, toHex } from '@kith/shared';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

import type { Db } from '../db';
import * as schema from '../db/schema';
import { devices, users } from '../db/schema';
import { blockersAmong, blockUser, listBlockedIds, listBlockedPublic, unblockUser } from './blocks';
import { createOrGetDirect } from './conversations';
import { history, persistMessage } from './messages';

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
  return { client, db, alice: alice!, bob: bob!, aliceDevice: aliceDevice! };
}

test('blocking excludes the sender from the reader history and delivery, and unblock restores it', async () => {
  const { client, db, alice, bob, aliceDevice } = await setup();
  const conv = await createOrGetDirect(alice.id, bob.id, db);
  await persistMessage({ conversationId: conv.id, senderUserId: alice.id, senderDeviceId: aliceDevice.id, envelope: envelope('hi bob') }, db);

  // Before blocking, bob sees alice's message and no one is a blocker.
  assert.equal((await history(conv.id, null, 50, db, await listBlockedIds(bob.id, db))).length, 1);
  assert.equal((await blockersAmong([bob.id], alice.id, db)).size, 0);

  // Bob blocks alice.
  await blockUser(bob.id, alice.id, db);
  assert.deepEqual(await listBlockedIds(bob.id, db), [alice.id]);
  assert.equal((await blockersAmong([bob.id], alice.id, db)).has(bob.id), true, 'gateway will skip delivery to bob');
  assert.equal((await history(conv.id, null, 50, db, await listBlockedIds(bob.id, db))).length, 0, 'alice is excluded from bob history');
  // The block is one-directional: alice still sees the thread.
  assert.equal((await history(conv.id, null, 50, db, await listBlockedIds(alice.id, db))).length, 1);
  const publicList = await listBlockedPublic(bob.id, db);
  assert.equal(publicList.length, 1);
  assert.equal(publicList[0]!.username, 'alice');

  // Unblock reverses everything.
  await unblockUser(bob.id, alice.id, db);
  assert.deepEqual(await listBlockedIds(bob.id, db), []);
  assert.equal((await blockersAmong([bob.id], alice.id, db)).size, 0);
  assert.equal((await history(conv.id, null, 50, db, await listBlockedIds(bob.id, db))).length, 1);
  await client.close();
});
