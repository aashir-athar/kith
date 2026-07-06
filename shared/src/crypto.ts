// Runtime-agnostic crypto contract. The RN client implements seal/open with @noble + expo
// primitives; the server implements ONLY verifySignedPreKey (it never derives a shared secret
// and never decrypts). Kept as a pure interface so both sides share the shape, never the
// native implementation.

export interface IdentityKeys {
  ikPub: Uint8Array; // Ed25519 identity public (signing)
  ikSecret: Uint8Array; // Ed25519 identity secret
  ikDhPub: Uint8Array; // X25519 identity DH public
  ikDhSecret: Uint8Array; // X25519 identity DH secret
}

export interface PreKeyBundleBytes {
  ikPub: Uint8Array;
  ikDhPub: Uint8Array;
  spkId: string;
  spkPub: Uint8Array;
  spkSig: Uint8Array;
  opk: { id: string; pub: Uint8Array } | null;
}

export interface EnvelopeBytes {
  senderIkPub: Uint8Array;
  senderIkDhPub: Uint8Array;
  ephemeralPub: Uint8Array;
  usedSpkId: string;
  usedOpkId: string | null;
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

/** Secret material a recipient needs to reconstruct a session key from an inbound envelope. */
export interface RecipientSecrets {
  ikDhSecret: Uint8Array;
  spkSecret: (spkId: string) => Uint8Array;
  opkSecret: (opkId: string) => Uint8Array | undefined;
}

export const HKDF_INFO = 'kith-x3dh-v1';
