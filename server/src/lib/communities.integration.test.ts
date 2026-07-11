// Verifies communities against Postgres (PGlite): creating a community makes a group conversation
// per channel with the members, listing returns them for a member with the right member count, and
// a non-member sees nothing.

import assert from 'node:assert/strict';
import { randomBytes as nodeRandomBytes } from 'node:crypto';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

import type { Db } from '../db';
import * as schema from '../db/schema';
import { users } from '../db/schema';
import { createCommunity, listCommunities } from './communities';
import { participantIds } from './conversations';

const rnd = (n: number) => new Uint8Array(nodeRandomBytes(n));
const MIGRATIONS = fileURLToPath(new URL('../../drizzle', import.meta.url));

async function setup() {
  const client = new PGlite();
  const pdb = drizzle(client, { schema, casing: 'snake_case' });
  await migrate(pdb, { migrationsFolder: MIGRATIONS });
  const db = pdb as unknown as Db;
  const [alice] = await db.insert(users).values({ username: 'alice', displayName: 'Alice' }).returning();
  const [bob] = await db.insert(users).values({ username: 'bob', displayName: 'Bob' }).returning();
  const [carol] = await db.insert(users).values({ username: 'carol', displayName: 'Carol' }).returning();
  return { client, db, alice: alice!, bob: bob!, carol: carol! };
}

test('createCommunity makes a group conversation per channel; members see it, non-members do not', async () => {
  const { client, db, alice, bob, carol } = await setup();
  const community = await createCommunity(alice.id, 'Frontline', 'Press room', [bob.id], ['general', 'random'], db);

  assert.equal(community.name, 'Frontline');
  assert.equal(community.memberCount, 2, 'alice + bob');
  assert.equal(community.channels.length, 2);

  // Each channel is backed by a group conversation with both members.
  for (const ch of community.channels) {
    const members = (await participantIds(ch.conversationId, db)).sort();
    assert.deepEqual(members, [alice.id, bob.id].sort());
  }

  // A member sees the community and its channels.
  const bobList = await listCommunities(bob.id, db);
  assert.equal(bobList.length, 1);
  assert.equal(bobList[0]!.id, community.id);
  assert.equal(bobList[0]!.memberCount, 2);
  assert.equal(bobList[0]!.channels.length, 2);

  // A non-member sees nothing.
  assert.equal((await listCommunities(carol.id, db)).length, 0);
  await client.close();
});
