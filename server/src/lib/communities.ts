// Communities. A community is a directory of channels, and each channel is a group conversation, so
// channel messaging reuses the group end-to-end path with zero new crypto. Members are the group
// participants of the channels.

import type { CommunityDTO } from '@kith/shared';
import { and, eq, inArray } from 'drizzle-orm';

import { db as defaultDb, type Db } from '../db';
import { channels, communities, conversationParticipants } from '../db/schema';
import { createGroup } from './conversations';

export async function createCommunity(
  creatorId: string,
  name: string,
  description: string | null,
  memberIds: string[],
  channelNames: string[],
  db: Db = defaultDb,
): Promise<CommunityDTO> {
  const [community] = await db.insert(communities).values({ name, description }).returning();
  if (!community) throw new Error('community insert failed');
  const created: CommunityDTO['channels'] = [];
  for (const channelName of channelNames) {
    const conv = await createGroup(creatorId, `${name} #${channelName}`, memberIds, db);
    const [ch] = await db.insert(channels).values({ communityId: community.id, conversationId: conv.id, name: channelName }).returning();
    if (ch) created.push({ id: ch.id, conversationId: ch.conversationId, name: ch.name });
  }
  const memberCount = new Set([creatorId, ...memberIds]).size;
  return { id: community.id, name: community.name, description: community.description ?? null, memberCount, channels: created };
}

/** The communities the caller belongs to (a member of any of their channels), with their channels. */
export async function listCommunities(userId: string, db: Db = defaultDb): Promise<CommunityDTO[]> {
  const mine = await db
    .selectDistinct({ communityId: channels.communityId })
    .from(channels)
    .innerJoin(
      conversationParticipants,
      and(eq(conversationParticipants.conversationId, channels.conversationId), eq(conversationParticipants.userId, userId)),
    );
  const communityIds = mine.map((m) => m.communityId);
  if (communityIds.length === 0) return [];
  const [comms, allChannels] = await Promise.all([
    db.select().from(communities).where(inArray(communities.id, communityIds)),
    db.select().from(channels).where(inArray(channels.communityId, communityIds)),
  ]);
  // Distinct members across each community's channel conversations.
  const convIds = allChannels.map((ch) => ch.conversationId);
  const parts = convIds.length
    ? await db.select({ conversationId: conversationParticipants.conversationId, userId: conversationParticipants.userId }).from(conversationParticipants).where(inArray(conversationParticipants.conversationId, convIds))
    : [];
  return comms.map((c) => {
    const cChannels = allChannels.filter((ch) => ch.communityId === c.id);
    const cConvIds = new Set(cChannels.map((ch) => ch.conversationId));
    const memberCount = new Set(parts.filter((p) => cConvIds.has(p.conversationId)).map((p) => p.userId)).size;
    return {
      id: c.id,
      name: c.name,
      description: c.description ?? null,
      memberCount,
      channels: cChannels.map((ch) => ({ id: ch.id, conversationId: ch.conversationId, name: ch.name })),
    };
  });
}
