// Communities. In a live build these are hydrated from the relay and created for real (each channel
// is a group conversation); the offline demo keeps the local seed. Opening a channel opens its
// backing group conversation thread.

import { create } from 'zustand';

import { api } from '@/api/client';
import { newId } from '@/lib/id';
import { communities as seedCommunities, usersById } from '@/lib/mockData';
import { BACKEND_ENABLED } from '@/net/config';
import { useChatStore } from '@/stores/useChatStore';
import { useSessionStore } from '@/stores/useSessionStore';
import type { Community } from '@/types/models';
import type { CommunityDTO } from '@kith/shared';

function fromDTO(dto: CommunityDTO): Community {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? 'Encrypted community.',
    memberCount: dto.memberCount,
    accentSeed: dto.id,
    channels: dto.channels.map((ch) => ({ id: ch.id, communityId: dto.id, name: ch.name, kind: 'text', unreadCount: 0, conversationId: ch.conversationId })),
  };
}

interface CommunityState {
  communities: Community[];
  hydrateCommunities: () => Promise<void>;
  createCommunity: (name: string, description: string, memberIds?: string[]) => Promise<Community>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  communities: BACKEND_ENABLED ? [] : seedCommunities,
  hydrateCommunities: async () => {
    const token = useSessionStore.getState().serverToken;
    if (!BACKEND_ENABLED || !token) return;
    try {
      const { communities } = await api.listCommunities(token);
      set({ communities: communities.map(fromDTO) });
    } catch {
      // best-effort; the list stays as-is
    }
  },
  createCommunity: async (name, description, memberIds = []) => {
    if (!BACKEND_ENABLED) {
      const id = newId();
      const community: Community = {
        id,
        name: name.trim(),
        description: description.trim() || 'A new encrypted room.',
        memberCount: 1,
        accentSeed: id,
        channels: [{ id: newId(), communityId: id, name: 'general', kind: 'text', unreadCount: 0 }],
      };
      set({ communities: [community, ...get().communities] });
      return community;
    }
    const token = useSessionStore.getState().serverToken;
    if (!token) throw new Error('no session');
    const usernames = memberIds.map((mid) => usersById[mid]?.username).filter((u): u is string => !!u);
    const dto = await api.createCommunity(token, name.trim(), description.trim(), usernames);
    const community = fromDTO(dto);
    set({ communities: [community, ...get().communities] });
    // Pull the new channel group conversations into the chat store so their threads render.
    void useChatStore.getState().hydrateFromServer();
    return community;
  },
}));
