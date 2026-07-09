// Verifies push-token registration and the content-free notify path against Postgres (PGlite):
// tokens upsert per device, the payload never carries message text, and tokens Expo reports as
// dead are pruned. The Expo HTTP call is injected so the test never hits the network.

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

import type { Db } from '../db';
import * as schema from '../db/schema';
import { users } from '../db/schema';
import { type ExpoPushMessage, type ExpoTicket, notifyNewMessage, registerPushToken, tokensForUsers } from './push';

const MIGRATIONS = fileURLToPath(new URL('../../drizzle', import.meta.url));

async function setup() {
  const client = new PGlite();
  const pdb = drizzle(client, { schema, casing: 'snake_case' });
  await migrate(pdb, { migrationsFolder: MIGRATIONS });
  const db = pdb as unknown as Db;
  const [alice] = await db.insert(users).values({ username: 'alice', displayName: 'Alice' }).returning();
  const [bob] = await db.insert(users).values({ username: 'bob', displayName: 'Bob' }).returning();
  return { client, db, alice: alice!, bob: bob! };
}

test('push token upserts per device and reassigns to the latest user', async () => {
  const { client, db, alice, bob } = await setup();
  await registerPushToken(alice.id, 'ExpoTok[1]', 'ios', db);
  assert.deepEqual(await tokensForUsers([alice.id], db), ['ExpoTok[1]']);
  // Same physical token now belongs to bob (device handed over / re-login): reassigned, not duplicated.
  await registerPushToken(bob.id, 'ExpoTok[1]', 'ios', db);
  assert.deepEqual(await tokensForUsers([alice.id], db), []);
  assert.deepEqual(await tokensForUsers([bob.id], db), ['ExpoTok[1]']);
  await client.close();
});

test('notify sends a content-free push and prunes dead tokens', async () => {
  const { client, db, alice } = await setup();
  await registerPushToken(alice.id, 'ExpoTok[live]', 'android', db);
  await registerPushToken(alice.id, 'ExpoTok[dead]', 'android', db);

  const sent: ExpoPushMessage[] = [];
  const fakeSend = async (messages: ExpoPushMessage[]): Promise<ExpoTicket[]> => {
    sent.push(...messages);
    // Map order to tokens: mark the second (dead) token as unregistered.
    return messages.map((m) => (m.to === 'ExpoTok[dead]' ? { status: 'error', details: { error: 'DeviceNotRegistered' } } : { status: 'ok' }));
  };

  await notifyNewMessage([alice.id], { conversationId: 'conv-123' }, db, fakeSend);

  // The payload is content-free: a generic body, the conversation id, and no message text.
  assert.equal(sent.length, 2);
  for (const m of sent) {
    assert.equal(m.body, 'New message');
    assert.equal(m.data.conversationId, 'conv-123');
    assert.equal((m as unknown as { text?: string }).text, undefined);
  }
  // The dead token was pruned; only the live one remains.
  assert.deepEqual(await tokensForUsers([alice.id], db), ['ExpoTok[live]']);
  // A user with no tokens is a no-op (no throw).
  await notifyNewMessage([randomUUID()], {}, db, fakeSend);
  await client.close();
});
