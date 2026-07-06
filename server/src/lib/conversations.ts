// Conversation resolution. Direct chats dedupe on a canonical sorted-member key so two people
// always share exactly one conversation regardless of who starts it.

import { eq } from 'drizzle-orm';

import { db as defaultDb, type Db } from '../db';
import { conversationParticipants, conversations } from '../db/schema';

export function dmKeyFor(a: string, b: string): string {
  return [a, b].sort().join(':');
}

export async function createOrGetDirect(userA: string, userB: string, db: Db = defaultDb) {
  const key = dmKeyFor(userA, userB);
  const inserted = await db
    .insert(conversations)
    .values({ kind: 'direct', dmKey: key })
    .onConflictDoNothing({ target: conversations.dmKey })
    .returning();
  let conv = inserted[0];
  if (conv) {
    await db
      .insert(conversationParticipants)
      .values([
        { conversationId: conv.id, userId: userA },
        { conversationId: conv.id, userId: userB },
      ])
      .onConflictDoNothing();
  } else {
    [conv] = await db.select().from(conversations).where(eq(conversations.dmKey, key)).limit(1);
  }
  if (!conv) throw new Error('failed to resolve direct conversation');
  return conv;
}

export async function participantIds(conversationId: string, db: Db = defaultDb): Promise<string[]> {
  const rows = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(eq(conversationParticipants.conversationId, conversationId));
  return rows.map((r) => r.userId);
}
