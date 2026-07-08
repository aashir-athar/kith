// Exercises the real conversation + message persistence functions against Postgres (PGlite):
// direct-conversation dedupe, monotonic seq assignment, envelope split/reconstruct, and history
// / sync pagination.

import assert from 'node:assert/strict';
import { randomBytes as nodeRandomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { fromHex, type MessageEnvelope, toHex } from '@kith/shared';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

import type { Db } from '../db';
import * as schema from '../db/schema';
import { devices, users } from '../db/schema';
import { createOrGetDirect, listConversations, participantIds } from './conversations';
import { deleteMessageAt, editMessage, history, isParticipant, persistMessage, syncAfter } from './messages';

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

test('direct conversation dedupes and both users are participants', async () => {
  const { client, db, alice, bob } = await setup();
  const c1 = await createOrGetDirect(alice.id, bob.id, db);
  const c2 = await createOrGetDirect(bob.id, alice.id, db); // reversed order
  assert.equal(c1.id, c2.id, 'same conversation regardless of who starts it');
  assert.deepEqual([...(await participantIds(c1.id, db))].sort(), [alice.id, bob.id].sort());
  assert.equal(await isParticipant(c1.id, alice.id, db), true);
  assert.equal(await isParticipant(c1.id, randomUUID(), db), false);
  await client.close();
});

test('messages get monotonic seq and round-trip through history/sync', async () => {
  const { client, db, alice, bob, aliceDevice } = await setup();
  const conv = await createOrGetDirect(alice.id, bob.id, db);
  const send = (text: string) =>
    persistMessage({ conversationId: conv.id, senderUserId: alice.id, senderDeviceId: aliceDevice.id, envelope: envelope(text) }, db);

  const [m1, m2, m3] = [await send('one'), await send('two'), await send('three')];
  assert.deepEqual([m1.seq, m2.seq, m3.seq], [1, 2, 3]);

  const all = await history(conv.id, null, 50, db);
  assert.deepEqual(
    all.map((m) => m.seq),
    [1, 2, 3],
  );
  // ciphertext survived the bytea split + jsonb reconstruct
  assert.equal(new TextDecoder().decode(fromHex(all[0]!.envelope.ciphertext)), 'one');

  const after = await syncAfter(conv.id, 1, 200, db);
  assert.deepEqual(
    after.map((m) => m.seq),
    [2, 3],
  );

  const page = await history(conv.id, 3, 50, db); // older than seq 3
  assert.deepEqual(
    page.map((m) => m.seq),
    [1, 2],
  );
  await client.close();
});

test('listConversations returns peer identity, last message, and unread', async () => {
  const { client, db, alice, bob, aliceDevice } = await setup();
  const conv = await createOrGetDirect(alice.id, bob.id, db);
  await persistMessage({ conversationId: conv.id, senderUserId: alice.id, senderDeviceId: aliceDevice.id, envelope: envelope('hi bob') }, db);

  const bobList = await listConversations(bob.id, db);
  assert.equal(bobList.length, 1);
  assert.equal(bobList[0]!.id, conv.id);
  assert.equal(bobList[0]!.peer?.username, 'alice');
  assert.equal(bobList[0]!.peer?.displayName, 'Alice');
  assert.equal(bobList[0]!.unreadCount, 1);
  assert.equal(bobList[0]!.lastMessage?.senderId, alice.id);
  assert.equal(new TextDecoder().decode(fromHex(bobList[0]!.lastMessage!.envelope.ciphertext)), 'hi bob');

  const aliceList = await listConversations(alice.id, db);
  assert.equal(aliceList[0]!.peer?.username, 'bob');
  await client.close();
});

test('edit and delete are sender-only and reflected in history', async () => {
  const { client, db, alice, bob, aliceDevice } = await setup();
  const conv = await createOrGetDirect(alice.id, bob.id, db);
  const m = await persistMessage({ conversationId: conv.id, senderUserId: alice.id, senderDeviceId: aliceDevice.id, envelope: envelope('original') }, db);

  // A non-sender cannot edit or delete.
  assert.equal(await editMessage(conv.id, m.seq, bob.id, envelope('hacked'), db), false);
  assert.equal(await deleteMessageAt(conv.id, m.seq, bob.id, db), false);

  // The sender edits their own message.
  assert.equal(await editMessage(conv.id, m.seq, alice.id, envelope('edited text'), db), true);
  let all = await history(conv.id, null, 50, db);
  assert.equal(new TextDecoder().decode(fromHex(all[0]!.envelope.ciphertext)), 'edited text');
  assert.ok(all[0]!.editedAt);
  assert.equal(all[0]!.deleted, false);

  // The sender deletes for everyone (tombstone).
  assert.equal(await deleteMessageAt(conv.id, m.seq, alice.id, db), true);
  all = await history(conv.id, null, 50, db);
  assert.equal(all[0]!.deleted, true);

  // A deleted message can no longer be edited.
  assert.equal(await editMessage(conv.id, m.seq, alice.id, envelope('resurrect'), db), false);
  await client.close();
});
