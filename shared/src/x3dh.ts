// X3DH-lite: X25519 ECDH key agreement + XChaCha20-Poly1305 AEAD + HKDF-SHA256, using @noble on
// both client and server. Pure and runtime-agnostic: randomness is injected (client -> expo
// CSPRNG, server/test -> node CSPRNG), so there is ONE audited implementation, never duplicated.
//
// Security posture (V1): confidentiality + sender auth + async first message. NOT forward
// secrecy / post-compromise security (static session key per X3DH). Double Ratchet is the
// upgrade path; do not claim "perfect forward secrecy" in UI until it lands.

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { ed25519, x25519 } from '@noble/curves/ed25519.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

import { HKDF_INFO, type EnvelopeBytes, type PreKeyBundleBytes } from './crypto';
import type { MessageEnvelope } from './envelope';

export type RandomBytes = (n: number) => Uint8Array;

export const toHex = bytesToHex;
export const fromHex = hexToBytes;

/** ASCII-only encoder (header + HKDF info are hex/uuid/ASCII); avoids relying on TextEncoder. */
const ascii = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};

const concatBytes = (...arrays: Uint8Array[]): Uint8Array => {
  let total = 0;
  for (const a of arrays) total += a.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
};

export interface IdentityKeyPairs {
  ikSecret: Uint8Array; // Ed25519 signing secret
  ikPub: Uint8Array; // Ed25519 signing public
  ikDhSecret: Uint8Array; // X25519 DH secret
  ikDhPub: Uint8Array; // X25519 DH public
}

export function generateIdentity(random: RandomBytes): IdentityKeyPairs {
  const ikSecret = random(32);
  const ikDhSecret = random(32);
  return { ikSecret, ikPub: ed25519.getPublicKey(ikSecret), ikDhSecret, ikDhPub: x25519.getPublicKey(ikDhSecret) };
}

export function generateX25519(random: RandomBytes): { secret: Uint8Array; pub: Uint8Array } {
  const secret = random(32);
  return { secret, pub: x25519.getPublicKey(secret) };
}

export function signPreKey(spkPub: Uint8Array, ikSecret: Uint8Array): Uint8Array {
  return ed25519.sign(spkPub, ikSecret);
}

export function verifySignedPreKey(spkPub: Uint8Array, spkSig: Uint8Array, ikPub: Uint8Array): boolean {
  try {
    return ed25519.verify(spkSig, spkPub, ikPub);
  } catch {
    return false;
  }
}

type Header = Omit<EnvelopeBytes, 'nonce' | 'ciphertext'>;

/** Canonical AAD binding the routing header so a relay cannot swap the DH path. */
const headerAad = (h: Header): Uint8Array =>
  ascii(['1', h.usedSpkId, h.usedOpkId ?? '', toHex(h.senderIkPub), toHex(h.senderIkDhPub), toHex(h.ephemeralPub)].join('|'));

const deriveSK = (dhs: Uint8Array[]): Uint8Array => hkdf(sha256, concatBytes(...dhs), new Uint8Array(32), ascii(HKDF_INFO), 32);

export interface SenderIdentity {
  ikPub: Uint8Array;
  ikDhPub: Uint8Array;
  ikDhSecret: Uint8Array;
}

/** Alice seals to Bob's fetched prekey bundle. Fresh ephemeral + nonce per message. */
export function seal(plaintext: Uint8Array, sender: SenderIdentity, bundle: PreKeyBundleBytes, random: RandomBytes): EnvelopeBytes {
  if (!verifySignedPreKey(bundle.spkPub, bundle.spkSig, bundle.ikPub)) {
    throw new Error('invalid signed prekey signature');
  }
  const eph = generateX25519(random);
  const dhs = [
    x25519.getSharedSecret(sender.ikDhSecret, bundle.spkPub), // DH1 = IK_A x SPK_B
    x25519.getSharedSecret(eph.secret, bundle.ikDhPub), // DH2 = EK_A x IK_B
    x25519.getSharedSecret(eph.secret, bundle.spkPub), // DH3 = EK_A x SPK_B
  ];
  if (bundle.opk) dhs.push(x25519.getSharedSecret(eph.secret, bundle.opk.pub)); // DH4 = EK_A x OPK_B
  const sk = deriveSK(dhs);
  const header: Header = {
    senderIkPub: sender.ikPub,
    senderIkDhPub: sender.ikDhPub,
    ephemeralPub: eph.pub,
    usedSpkId: bundle.spkId,
    usedOpkId: bundle.opk?.id ?? null,
  };
  const nonce = random(24);
  const ciphertext = xchacha20poly1305(sk, nonce, headerAad(header)).encrypt(plaintext);
  sk.fill(0);
  eph.secret.fill(0);
  return { ...header, nonce, ciphertext };
}

export interface RecipientKeys {
  ikDhSecret: Uint8Array;
  spkSecret: (spkId: string) => Uint8Array | undefined;
  opkSecret: (opkId: string) => Uint8Array | undefined;
}

/** Bob reconstructs the same session key from his stored secrets and decrypts. */
export function open(env: EnvelopeBytes, keys: RecipientKeys): Uint8Array {
  const spkSecret = keys.spkSecret(env.usedSpkId);
  if (!spkSecret) throw new Error('unknown signed prekey');
  const dhs = [
    x25519.getSharedSecret(spkSecret, env.senderIkDhPub), // DH1
    x25519.getSharedSecret(keys.ikDhSecret, env.ephemeralPub), // DH2
    x25519.getSharedSecret(spkSecret, env.ephemeralPub), // DH3
  ];
  if (env.usedOpkId != null) {
    const opk = keys.opkSecret(env.usedOpkId);
    if (!opk) throw new Error('unknown one-time prekey');
    dhs.push(x25519.getSharedSecret(opk, env.ephemeralPub)); // DH4
  }
  const sk = deriveSK(dhs);
  const plaintext = xchacha20poly1305(sk, env.nonce, headerAad(env)).decrypt(env.ciphertext);
  sk.fill(0);
  return plaintext;
}

export function envelopeToWire(e: EnvelopeBytes): MessageEnvelope {
  return {
    v: 1,
    type: 'prekey',
    senderIkPub: toHex(e.senderIkPub),
    senderIkDhPub: toHex(e.senderIkDhPub),
    ephemeralPub: toHex(e.ephemeralPub),
    usedSpkId: e.usedSpkId,
    usedOpkId: e.usedOpkId,
    nonce: toHex(e.nonce),
    ciphertext: toHex(e.ciphertext),
  };
}

export function envelopeFromWire(w: MessageEnvelope): EnvelopeBytes {
  return {
    senderIkPub: fromHex(w.senderIkPub),
    senderIkDhPub: fromHex(w.senderIkDhPub),
    ephemeralPub: fromHex(w.ephemeralPub),
    usedSpkId: w.usedSpkId,
    usedOpkId: w.usedOpkId,
    nonce: fromHex(w.nonce),
    ciphertext: fromHex(w.ciphertext),
  };
}
