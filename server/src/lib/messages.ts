// Message persistence. Persist-then-ack with a monotonic per-conversation seq assigned atomically
// (UPDATE ... RETURNING inside the same transaction as the insert). Ciphertext is stored as bytea
// and routing metadata as jsonb; the server never sees plaintext. Every read serializes to the
// shared MessageDTO (senderId), the same shape the socket 'message' frame uses.

import { fromHex, MessageDTO, MessageEnvelope, toHex } from '@kith/shared';
import { and, asc, desc, eq, gt, lt, notInArray, sql } from 'drizzle-orm';

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
  return {
    id: row.id,
    conversationId: row.conversationId,
    seq: row.seq,
    senderId: row.senderUserId,
    envelope,
    createdAt: row.createdAt.getTime(),
    editedAt: row.editedAt ? row.editedAt.getTime() : null,
    deleted: row.deleted,
  };
}

/** Edit (re-seal) a message. Only the original sender can; a deleted message cannot be edited. */
export async function editMessage(conversationId: string, seq: number, senderUserId: string, envelope: MessageEnvelope, db: Db = defaultDb): Promise<boolean> {
  const { ciphertext, ...routing } = envelope;
  const updated = await db
    .update(messages)
    .set({ envelope: routing, ciphertext: fromHex(ciphertext), editedAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.seq, seq),
        eq(messages.senderUserId, senderUserId),
        eq(messages.deleted, false),
      ),
    )
    .returning({ id: messages.id });
  return updated.length > 0;
}

/** Delete-for-everyone. Only the original sender can; the ciphertext is wiped to a tombstone. */
export async function deleteMessageAt(conversationId: string, seq: number, senderUserId: string, db: Db = defaultDb): Promise<boolean> {
  const updated = await db
    .update(messages)
    .set({ deleted: true, ciphertext: new Uint8Array([0]), editedAt: new Date() })
    .where(and(eq(messages.conversationId, conversationId), eq(messages.seq, seq), eq(messages.senderUserId, senderUserId)))
    .returning({ id: messages.id });
  return updated.length > 0;
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

/** Everything after a cursor, ascending, for reconnect resync. Messages from `excludeSenders` (the
 * reader's blocked users) are filtered out so a blocked sender never reaches the reader. */
export async function syncAfter(conversationId: string, afterSeq: number, limit = 200, db: Db = defaultDb, excludeSenders: string[] = []): Promise<MessageDTO[]> {
  const conditions = [eq(messages.conversationId, conversationId), gt(messages.seq, afterSeq)];
  if (excludeSenders.length > 0) conditions.push(notInArray(messages.senderUserId, excludeSenders));
  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(asc(messages.seq))
    .limit(limit);
  return rows.map(toDTO);
}

/** A page of history older than `beforeSeq` (or the latest), returned ascending. Excludes messages
 * from `excludeSenders` (the reader's blocked users). */
export async function history(conversationId: string, beforeSeq: number | null, limit = 50, db: Db = defaultDb, excludeSenders: string[] = []): Promise<MessageDTO[]> {
  const conditions = [eq(messages.conversationId, conversationId)];
  if (beforeSeq != null) conditions.push(lt(messages.seq, beforeSeq));
  if (excludeSenders.length > 0) conditions.push(notInArray(messages.senderUserId, excludeSenders));
  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.seq))
    .limit(limit);
  return rows.reverse().map(toDTO);
}
