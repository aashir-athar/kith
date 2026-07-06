// Message persistence. Persist-then-ack with a monotonic per-conversation seq assigned atomically
// (UPDATE ... RETURNING inside the same transaction as the insert). Ciphertext is stored as bytea
// and the routing metadata as jsonb; the server never sees plaintext. History uses keyset
// pagination on seq.

import { fromHex, MessageEnvelope, toHex } from '@kith/shared';
import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

import { db as defaultDb, type Db } from '../db';
import { conversationParticipants, conversations, messages } from '../db/schema';

export interface MessageRecord {
  id: string;
  conversationId: string;
  seq: number;
  senderUserId: string;
  envelope: MessageEnvelope;
  createdAt: number;
}

export async function isParticipant(conversationId: string, userId: string, db: Db = defaultDb): Promise<boolean> {
  const [row] = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)))
    .limit(1);
  return !!row;
}

function toRecord(row: typeof messages.$inferSelect): MessageRecord {
  const envelope = MessageEnvelope.parse({ ...row.envelope, ciphertext: toHex(row.ciphertext) });
  return { id: row.id, conversationId: row.conversationId, seq: row.seq, senderUserId: row.senderUserId, envelope, createdAt: row.createdAt.getTime() };
}

export async function persistMessage(
  input: {
    conversationId: string;
    senderUserId: string;
    senderDeviceId: string;
    envelope: MessageEnvelope;
  },
  db: Db = defaultDb,
): Promise<MessageRecord> {
  return db.transaction(async (tx) => {
    // Claim the next sequence atomically. UPDATE ... RETURNING gives the post-increment value.
    const [conv] = await tx
      .update(conversations)
      .set({ nextSeq: sql`${conversations.nextSeq} + 1` })
      .where(eq(conversations.id, input.conversationId))
      .returning({ nextSeq: conversations.nextSeq });
    if (!conv) throw new Error('conversation not found');
    const seq = conv.nextSeq - 1;

    const { ciphertext, ...routing } = input.envelope;
    const [row] = await tx
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        seq,
        senderUserId: input.senderUserId,
        senderDeviceId: input.senderDeviceId,
        envelope: routing,
        ciphertext: fromHex(ciphertext),
      })
      .returning();
    if (!row) throw new Error('message insert failed');
    return toRecord(row);
  });
}

/** Everything after a cursor, ascending, for reconnect resync. */
export async function syncAfter(conversationId: string, afterSeq: number, limit = 200, db: Db = defaultDb): Promise<MessageRecord[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), gt(messages.seq, afterSeq)))
    .orderBy(asc(messages.seq))
    .limit(limit);
  return rows.map(toRecord);
}

/** Advance a participant's delivered/read cursor, monotonically (never moves backward). */
export async function advanceCursor(
  conversationId: string,
  userId: string,
  kind: 'delivered' | 'read',
  seq: number,
  db: Db = defaultDb,
): Promise<void> {
  const match = and(
    eq(conversationParticipants.conversationId, conversationId),
    eq(conversationParticipants.userId, userId),
    lt(kind === 'read' ? conversationParticipants.lastReadSeq : conversationParticipants.lastDeliveredSeq, seq),
  );
  await db
    .update(conversationParticipants)
    .set(kind === 'read' ? { lastReadSeq: seq } : { lastDeliveredSeq: seq })
    .where(match);
}

/** A page of history older than `beforeSeq` (or the latest), returned ascending. */
export async function history(conversationId: string, beforeSeq: number | null, limit = 50, db: Db = defaultDb): Promise<MessageRecord[]> {
  const where =
    beforeSeq == null
      ? eq(messages.conversationId, conversationId)
      : and(eq(messages.conversationId, conversationId), lt(messages.seq, beforeSeq));
  const rows = await db.select().from(messages).where(where).orderBy(desc(messages.seq)).limit(limit);
  return rows.reverse().map(toRecord);
}
