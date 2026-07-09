// Block list. A block is one-directional (blocker -> blocked) and enforced in two places: the
// gateway never forwards or pushes a blocked sender's traffic, and history/sync exclude their
// messages for the reader. Sending is not rejected, so block status is not leaked to the sender.

import type { UserPublic } from '@kith/shared';
import { and, eq, inArray } from 'drizzle-orm';

import { db as defaultDb, type Db } from '../db';
import { blocks, users } from '../db/schema';

export async function blockUser(blockerId: string, blockedId: string, db: Db = defaultDb): Promise<void> {
  await db.insert(blocks).values({ blockerId, blockedId }).onConflictDoNothing();
}

export async function unblockUser(blockerId: string, blockedId: string, db: Db = defaultDb): Promise<void> {
  await db.delete(blocks).where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
}

/** The user ids this reader has blocked (used to exclude their messages from reads). */
export async function listBlockedIds(blockerId: string, db: Db = defaultDb): Promise<string[]> {
  const rows = await db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, blockerId));
  return rows.map((r) => r.id);
}

/** The blocked users as public profiles, for the client's blocked-users screen. */
export async function listBlockedPublic(blockerId: string, db: Db = defaultDb): Promise<UserPublic[]> {
  const rows = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(blocks)
    .innerJoin(users, eq(users.id, blocks.blockedId))
    .where(eq(blocks.blockerId, blockerId));
  return rows;
}

/** Of the candidate recipients, which have blocked this sender (so we do not deliver to them). */
export async function blockersAmong(candidateBlockerIds: string[], blockedId: string, db: Db = defaultDb): Promise<Set<string>> {
  if (candidateBlockerIds.length === 0) return new Set();
  const rows = await db
    .select({ blockerId: blocks.blockerId })
    .from(blocks)
    .where(and(inArray(blocks.blockerId, candidateBlockerIds), eq(blocks.blockedId, blockedId)));
  return new Set(rows.map((r) => r.blockerId));
}
