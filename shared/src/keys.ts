// Public key material exchanged during registration and prekey-bundle fetch. Only PUBLIC keys
// ever cross the wire; every secret key stays on the owner's device.

import { z } from 'zod';

import { b64 } from './envelope';

export const SignedPreKey = z.object({
  id: z.string(),
  pub: b64, // X25519 public
  sig: b64, // Ed25519 signature over `pub` by the identity key
});
export type SignedPreKey = z.infer<typeof SignedPreKey>;

export const OneTimePreKey = z.object({
  id: z.string(),
  pub: b64, // X25519 public
});
export type OneTimePreKey = z.infer<typeof OneTimePreKey>;

/** What a sender fetches to start (or resume) a session with a recipient. */
export const PreKeyBundle = z.object({
  ikPub: b64, // Ed25519 identity public (verify spk.sig against this)
  ikDhPub: b64, // X25519 identity DH public
  spk: SignedPreKey,
  opk: OneTimePreKey.nullable(), // one-time prekey, consumed atomically; null when exhausted
});
export type PreKeyBundle = z.infer<typeof PreKeyBundle>;
