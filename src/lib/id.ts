// ULID generation seeded with hardware entropy (expo-crypto). Client-generated ids give us
// stable list keys, dedup on server echo, and a lexicographic-by-time ordering hint.

import * as Crypto from 'expo-crypto';
import { monotonicFactory } from 'ulid';

function prng(): number {
  const bytes = Crypto.getRandomBytes(4);
  const value = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, false);
  return value / 0x100000000;
}

export const newId = monotonicFactory(prng);
