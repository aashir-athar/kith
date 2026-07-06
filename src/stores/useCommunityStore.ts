// Communities live in a store so the create action is real: a new room appears at the top of
// the list and opens like any other. Seeded from mock data.

import { create } from 'zustand';

import { newId } from '@/lib/id';
import { communities as seedCommunities } from '@/lib/mockData';
import type { Community } from '@/types/models';

interface CommunityState {
  communities: Community[];
  createCommunity: (name: string, description: string) => Community;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  communities: seedCommunities,
  createCommunity: (name, description) => {
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
  },
}));
