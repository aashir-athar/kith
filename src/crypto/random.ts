// CSPRNG for the client. expo-crypto is backed by the platform secure RNG (iOS SecRandom /
// Android SecureRandom). Injected into the shared X3DH functions so key/nonce generation never
// relies on a JS fallback.

import * as Crypto from 'expo-crypto';

export function randomBytes(n: number): Uint8Array {
  return Crypto.getRandomBytes(n);
}
