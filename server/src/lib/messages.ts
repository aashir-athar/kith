// Message persistence. Persist-then-ack with a monotonic per-conversation seq assigned atomically
// (UPDATE ... RETURNING inside the same transaction as the insert). Ciphertext is stored as bytea
// and routing metadata as jsonb; the server never sees plaintext. Every read serializes to the
// shared MessageDTO (senderId), the same shape the socket 'message' frame uses.

import { fromHex, MessageDTO, MessageEnvelope, toHex } from '@kith/shared';
import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm';

import { db as defaultDb, type Db } from '../db';
import { conversationParticipants, conversations, messages } from '../db/schema';

export async function isParticipant(conversationId: string, userId: string, db: Db = defaultDb): Promise<boolean> {
  const [row] = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)))
    .limit(1);
  return !!row;
}

export function toDTO(row: typeof messages.$inferSelect): MessageDTO {
  const envelope = MessageEnvelope.parse({ ...row.envelope, ciphertext: toHex(row.ciphertext) });
  return { id: row.id, conversationId: row.conversationId, seq: row.seq, senderId: row.senderUserId, envelope, createdAt: row.createdAt.getTime() };
}

export async function persistMessage(
  input: {
    conversationId: string;
    senderUserId: string;
    senderDeviceId: string;
    envelope: MessageEnvelope;
  },
  db: Db = defaultDb,
): Promise<MessageDTO> {
  return db.transaction(async (tx) => {
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
    return toDTO(row);
  });
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

/** Everything after a cursor, ascending, for reconnect resync. */
export async function syncAfter(conversationId: string, afterSeq: number, limit = 200, db: Db = defaultDb): Promise<MessageDTO[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), gt(messages.seq, afterSeq)))
    .orderBy(asc(messages.seq))
    .limit(limit);
  return rows.map(toDTO);
}

/** A page of history older than `beforeSeq` (or the latest), returned ascending. */
export async function history(conversationId: string, beforeSeq: number | null, limit = 50, db: Db = defaultDb): Promise<MessageDTO[]> {
  const where =
    beforeSeq == null
      ? eq(messages.conversationId, conversationId)
      : and(eq(messages.conversationId, conversationId), lt(messages.seq, beforeSeq));
  const rows = await db.select().from(messages).where(where).orderBy(desc(messages.seq)).limit(limit);
  return rows.reverse().map(toDTO);
}
