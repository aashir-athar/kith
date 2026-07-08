// Encrypted-at-rest storage adapter for the chat store. Message plaintext is serialized, sealed
// with a data key that lives ONLY in expo-secure-store, and the resulting CIPHERTEXT is written to
// AsyncStorage. Plaintext never touches disk; the secret is the key, which stays in secure-store.
// Inert in mock mode (the mock reseeds each launch).

import { decryptSym, encryptSym, fromHex, toHex } from '@kith/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

import { getOrCreateDataKey } from '@/crypto/keystore';
import { randomBytes } from '@/crypto/random';
import { BACKEND_ENABLED } from '@/net/config';

let cachedKey: Uint8Array | null = null;
async function dataKey(): Promise<Uint8Array> {
  if (!cachedKey) cachedKey = await getOrCreateDataKey();
  return cachedKey;
}

export const encryptedStorage: StateStorage = {
  getItem: async (name) => {
    if (!BACKEND_ENABLED) return null;
    const raw = await AsyncStorage.getItem(name);
    if (!raw) return null;
    try {
      const { n, c } = JSON.parse(raw) as { n: string; c: string };
      return new TextDecoder().decode(decryptSym(await dataKey(), fromHex(n), fromHex(c)));
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    if (!BACKEND_ENABLED) return;
    const { nonce, ciphertext } = encryptSym(await dataKey(), new TextEncoder().encode(value), randomBytes);
    await AsyncStorage.setItem(name, JSON.stringify({ n: toHex(nonce), c: toHex(ciphertext) }));
  },
  removeItem: async (name) => {
    await AsyncStorage.removeItem(name);
  },
};
