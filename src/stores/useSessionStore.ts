// Current-user/session state. In the shipped app this is seeded from the identity/crypto
// layer; for the frontend build it starts from the mock "me" user.

import { create } from 'zustand';

import { api } from '@/api/client';
import { bootstrapIdentity, hasIdentity, signChallenge } from '@/crypto/e2e';
import { loadSession, saveSession } from '@/crypto/keystore';
import { me } from '@/lib/mockData';
import { BACKEND_ENABLED } from '@/net/config';
import type { User } from '@/types/models';

interface SessionState {
  currentUser: User;
  onboarded: boolean;
  recoveryMethod: 'none' | 'pin' | 'phrase';
  serverToken: string | null;
  serverUserId: string | null;
  serverDeviceId: string | null;
  sessionRestored: boolean;
  setUsername: (username: string) => void;
  setDisplayName: (displayName: string) => void;
  setBio: (bio: string) => void;
  setAvatarUrl: (avatarUrl: string | undefined) => void;
  setRecoveryMethod: (method: 'none' | 'pin' | 'phrase') => void;
  completeOnboarding: () => void;
  registerWithServer: (username: string, displayName: string) => Promise<void>;
  loginWithServer: (username: string) => Promise<void>;
  restoreServerSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  currentUser: me,
  // In backend mode a real account is required, so start un-onboarded; the mock mode skips it.
  onboarded: !BACKEND_ENABLED,
  recoveryMethod: 'none',
  serverToken: null,
  serverUserId: null,
  serverDeviceId: null,
  sessionRestored: !BACKEND_ENABLED,
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
    set({ serverToken: session.token, serverUserId: session.userId, serverDeviceId: session.deviceId, onboarded: true });
  },
  loginWithServer: async (username) => {
    if (!(await hasIdentity())) throw new Error('no identity on this device; register instead');
    const { challenge } = await api.challenge(username);
    const signature = await signChallenge(challenge);
    const session = await api.verify({ username, challenge, signature });
    await saveSession({ token: session.token, userId: session.userId, deviceId: session.deviceId });
    set({ serverToken: session.token, serverUserId: session.userId, serverDeviceId: session.deviceId, onboarded: true });
  },
  restoreServerSession: async () => {
    const stored = await loadSession();
    if (stored) set({ serverToken: stored.token, serverUserId: stored.userId, serverDeviceId: stored.deviceId, onboarded: true, sessionRestored: true });
    else set({ sessionRestored: true });
  },
}));
