// Account erasure. Right-to-delete for a zero-knowledge relay: it removes the user, their devices
// and prekeys (cascade), their sent messages, and their conversation memberships. A shared
// conversation is only dropped once no participant remains, so a peer keeps their side of the
// thread. Message sender FKs are onDelete: restrict, so the sender's messages must go first.

import { eq } from 'drizzle-orm';

import { db as defaultDb, type Db } from '../db';
import { conversationParticipants, conversations, messages, users } from '../db/schema';

export async function deleteAccount(userId: string, db: Db = defaultDb): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(messages).where(eq(messages.senderUserId, userId));

    const memberships = await tx
      .select({ id: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    await tx.delete(conversationParticipants).where(eq(conversationParticipants.userId, userId));

    for (const { id } of memberships) {
      const [remaining] = await tx
        .select({ userId: conversationParticipants.userId })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, id))
        .limit(1);
      if (!remaining) await tx.delete(conversations).where(eq(conversations.id, id));
    }

    // Devices, signed prekeys, and one-time prekeys cascade from the user row.
    await tx.delete(users).where(eq(users.id, userId));
  });
}
