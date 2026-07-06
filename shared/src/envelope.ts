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
