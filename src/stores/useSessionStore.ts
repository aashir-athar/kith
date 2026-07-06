// Current-user/session state. In the shipped app this is seeded from the identity/crypto
// layer; for the frontend build it starts from the mock "me" user.

import { create } from 'zustand';

import { api } from '@/api/client';
import { bootstrapIdentity } from '@/crypto/e2e';
import { loadSession, saveSession } from '@/crypto/keystore';
import { me } from '@/lib/mockData';
import type { User } from '@/types/models';

interface SessionState {
  currentUser: User;
  onboarded: boolean;
  recoveryMethod: 'none' | 'pin' | 'phrase';
  serverToken: string | null;
  serverUserId: string | null;
  serverDeviceId: string | null;
  setUsername: (username: string) => void;
  setDisplayName: (displayName: string) => void;
  setBio: (bio: string) => void;
  setAvatarUrl: (avatarUrl: string | undefined) => void;
  setRecoveryMethod: (method: 'none' | 'pin' | 'phrase') => void;
  completeOnboarding: () => void;
  registerWithServer: (username: string, displayName: string) => Promise<void>;
  restoreServerSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentUser: me,
  onboarded: true,
  recoveryMethod: 'none',
  serverToken: null,
  serverUserId: null,
  serverDeviceId: null,
  setUsername: (username) => set((state) => ({ currentUser: { ...state.currentUser, username } })),
  setDisplayName: (displayName) => set((state) => ({ currentUser: { ...state.currentUser, displayName } })),
  setBio: (bio) => set((state) => ({ currentUser: { ...state.currentUser, bio } })),
  setAvatarUrl: (avatarUrl) => set((state) => ({ currentUser: { ...state.currentUser, avatarUrl } })),
  setRecoveryMethod: (recoveryMethod) => set({ recoveryMethod }),
  completeOnboarding: () => set({ onboarded: true }),
  registerWithServer: async (username, displayName) => {
    const material = await bootstrapIdentity();
    const session = await api.register({ username, displayName, ...material });
    await saveSession({ token: session.token, userId: session.userId, deviceId: session.deviceId });
    set({ serverToken: session.token, serverUserId: session.userId, serverDeviceId: session.deviceId });
  },
  restoreServerSession: async () => {
    const stored = await loadSession();
    if (stored) set({ serverToken: stored.token, serverUserId: stored.userId, serverDeviceId: stored.deviceId });
  },
}));
