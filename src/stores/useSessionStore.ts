// Current-user/session state. In the shipped app this is seeded from the identity/crypto
// layer; for the frontend build it starts from the mock "me" user.

import { create } from 'zustand';

import { me } from '@/lib/mockData';
import type { User } from '@/types/models';

interface SessionState {
  currentUser: User;
  onboarded: boolean;
  setUsername: (username: string) => void;
  setDisplayName: (displayName: string) => void;
  setBio: (bio: string) => void;
  setAvatarUrl: (avatarUrl: string | undefined) => void;
  completeOnboarding: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentUser: me,
  onboarded: true,
  setUsername: (username) => set((state) => ({ currentUser: { ...state.currentUser, username } })),
  setDisplayName: (displayName) => set((state) => ({ currentUser: { ...state.currentUser, displayName } })),
  setBio: (bio) => set((state) => ({ currentUser: { ...state.currentUser, bio } })),
  setAvatarUrl: (avatarUrl) => set((state) => ({ currentUser: { ...state.currentUser, avatarUrl } })),
  completeOnboarding: () => set({ onboarded: true }),
}));
