// The end-to-end encrypted message envelope. The relay stores and forwards this verbatim and
// can read only the routing metadata; ciphertext is opaque (XChaCha20-Poly1305). All byte
// fields travel as base64url strings on the wire and are decoded at the client/server boundary.

import { z } from 'zod';

/** A non-empty base64url-encoded byte string on the wire. */
export const b64 = z.string().min(1);

export const MessageEnvelope = z.object({
  v: z.literal(1),
  type: z.enum(['prekey', 'msg']),
  senderIkPub: b64, // Ed25519 identity public key
  senderIkDhPub: b64, // X25519 identity DH public key
  ephemeralPub: b64, // X25519 ephemeral public key
  usedSpkId: z.string(), // recipient signed-prekey id used for this session
  usedOpkId: z.string().nullable(), // recipient one-time-prekey id, or null if exhausted
  nonce: b64, // 24-byte XChaCha20 nonce, fresh per message
  ciphertext: b64, // XChaCha20-Poly1305 output (ciphertext || 16-byte tag)
});
export type MessageEnvelope = z.infer<typeof MessageEnvelope>;

// Group message envelope. The content is encrypted once with a fresh per-message key; that key is
// then sealed to each member individually via X3DH (`keys`), so the relay still only ever sees
// ciphertext and per-recipient key blobs, never the plaintext or the key.
export const GroupEnvelope = z.object({
  v: z.literal(1),
  type: z.literal('group'),
  nonce: b64, // content nonce (XChaCha20)
  ciphertext: b64, // content encrypted with the per-message key
  keys: z.record(z.string(), MessageEnvelope), // userId -> the per-message key, sealed to that member
});
export type GroupEnvelope = z.infer<typeof GroupEnvelope>;

/** What travels on the wire and is stored: a 1:1 envelope or a group envelope. */
export const WireEnvelope = z.union([MessageEnvelope, GroupEnvelope]);
export type WireEnvelope = z.infer<typeof WireEnvelope>;
