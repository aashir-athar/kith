// Status/Stories state. Ephemeral, encrypted, ad-free by design. Seeded from mock feeds.

import { create } from 'zustand';

import { newId } from '@/lib/id';
import { me, myStories as seedMyStories, statusFeeds as seedFeeds } from '@/lib/mockData';
import type { StatusFeed, Story, StoryKind } from '@/types/models';

interface StatusState {
  myStories: Story[];
  feeds: StatusFeed[];
  markSeen: (authorId: string) => void;
  addStatus: (kind: StoryKind, payload: { text?: string; mediaUrl?: string; background?: string }) => void;
}

export const useStatusStore = create<StatusState>((set) => ({
  myStories: seedMyStories,
  feeds: seedFeeds,
  markSeen: (authorId) =>
    set((state) => ({ feeds: state.feeds.map((f) => (f.authorId === authorId ? { ...f, hasUnseen: false } : f)) })),
  addStatus: (kind, payload) =>
    set((state) => ({
      myStories: [
        {
          id: newId(),
          authorId: me.id,
          kind,
          text: payload.text,
          mediaUrl: payload.mediaUrl,
          background: payload.background,
          createdAt: new Date().toISOString(),
        },
        ...state.myStories,
      ],
    })),
}));
