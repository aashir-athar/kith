// Passwordless auth challenges. The client signs the challenge with its Ed25519 identity key;
// the server verifies against the device's stored public key. Challenges are single-use.

import { redis } from '../redis';
import { token } from './ids';

const CHALLENGE_TTL_SECONDS = 120;
const key = (challenge: string) => `challenge:${challenge}`;

export async function createChallenge(username: string): Promise<{ challenge: string; expiresAt: number }> {
  const challenge = token(32);
  await redis.set(key(challenge), username, 'EX', CHALLENGE_TTL_SECONDS);
  return { challenge, expiresAt: Date.now() + CHALLENGE_TTL_SECONDS * 1000 };
}

/** Consume the challenge (single-use) and confirm it was issued for this username. */
export async function consumeChallenge(challenge: string, username: string): Promise<boolean> {
  const stored = await redis.getdel(key(challenge));
  return stored !== null && stored === username;
}
