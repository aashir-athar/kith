// REST DTOs. Auth is passwordless and key-based: the client proves control of its Ed25519
// identity key by signing a server challenge. Message send/receive happens over the socket.

import { z } from 'zod';

import { b64 } from './envelope';
import { OneTimePreKey, SignedPreKey } from './keys';

export const USERNAME_RE = /^[a-z0-9_]+$/;

export const RegisterRequest = z.object({
  username: z.string().min(3).max(32).regex(USERNAME_RE),
  displayName: z.string().min(1).max(60),
  ikPub: b64, // Ed25519 identity public
  ikDhPub: b64, // X25519 identity DH public
  spk: SignedPreKey,
  oneTimePreKeys: z.array(OneTimePreKey).min(1).max(200),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const AuthChallengeRequest = z.object({ username: z.string() });
export type AuthChallengeRequest = z.infer<typeof AuthChallengeRequest>;

export const AuthChallengeResponse = z.object({ challenge: z.string(), expiresAt: z.number() });
export type AuthChallengeResponse = z.infer<typeof AuthChallengeResponse>;

export const AuthVerifyRequest = z.object({
  username: z.string(),
  challenge: z.string(),
  signature: b64, // Ed25519 signature over utf8(challenge) with the identity key
});
export type AuthVerifyRequest = z.infer<typeof AuthVerifyRequest>;

export const SessionResponse = z.object({
  token: z.string(),
  userId: z.string(),
  deviceId: z.string(),
  expiresAt: z.number(),
});
export type SessionResponse = z.infer<typeof SessionResponse>;

/** Single-use realtime ticket, redeemed at WS upgrade. */
export const TicketResponse = z.object({ ticket: z.string(), expiresAt: z.number() });
export type TicketResponse = z.infer<typeof TicketResponse>;

export const ReplenishPreKeysRequest = z.object({
  oneTimePreKeys: z.array(OneTimePreKey).min(1).max(200),
});
export type ReplenishPreKeysRequest = z.infer<typeof ReplenishPreKeysRequest>;

export const UserPublic = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
});
export type UserPublic = z.infer<typeof UserPublic>;
