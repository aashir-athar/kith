// Conversation resolution. Direct chats dedupe on a canonical sorted-member key so two people
// always share exactly one conversation regardless of who starts it.

import type { ConversationSummary } from '@kith/shared';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';

import { db as defaultDb, type Db } from '../db';
import { conversationParticipants, conversations, messages, users } from '../db/schema';
import { toDTO } from './messages';

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

/** Set the caller's mute flag for a conversation (per-participant, so it never affects the peer). */
export async function setMuted(conversationId: string, userId: string, muted: boolean, db: Db = defaultDb): Promise<void> {
  await db
    .update(conversationParticipants)
    .set({ muted })
    .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)));
}

/** Of the candidate participants, which have muted this conversation (so we skip their push). */
export async function mutedAmong(conversationId: string, userIds: string[], db: Db = defaultDb): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conversationId),
        inArray(conversationParticipants.userId, userIds),
        eq(conversationParticipants.muted, true),
      ),
    );
  return new Set(rows.map((r) => r.userId));
}

/** The caller's conversations with peer identity, last message, unread count, and peer cursors. */
export async function listConversations(userId: string, db: Db = defaultDb): Promise<ConversationSummary[]> {
  const myParts = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, userId));
  const summaries: ConversationSummary[] = [];
  for (const mp of myParts) {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, mp.conversationId)).limit(1);
    if (!conv) continue;
    const others = await db
      .select()
      .from(conversationParticipants)
      .where(and(eq(conversationParticipants.conversationId, conv.id), ne(conversationParticipants.userId, userId)));
    const peerPart = others[0];
    let peer: ConversationSummary['peer'] = null;
    if (peerPart) {
      const [u] = await db
        .select({ id: users.id, username: users.username, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, peerPart.userId))
        .limit(1);
      peer = u ?? null;
    }
    const [lastRow] = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).orderBy(desc(messages.seq)).limit(1);
    summaries.push({
      id: conv.id,
      kind: conv.kind,
      peer,
      lastMessage: lastRow ? toDTO(lastRow) : null,
      unreadCount: Math.max(0, conv.nextSeq - 1 - mp.lastReadSeq),
      peerLastReadSeq: peerPart?.lastReadSeq ?? 0,
      peerLastDeliveredSeq: peerPart?.lastDeliveredSeq ?? 0,
    });
  }
  summaries.sort((a, b) => (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0));
  return summaries;
}
