// Client side of relay-hosted encrypted media. A file is encrypted on device with a fresh per-blob
// key, only the ciphertext is uploaded, and the key + nonce travel end-to-end inside the sealed
// message (a BlobRef). The relay stores opaque bytes; only the recipient can decrypt.

import { decryptSym, encryptSym, fromHex, toHex } from '@kith/shared';

import { api } from '@/api/client';
import { randomBytes } from '@/crypto/random';
import { useSessionStore } from '@/stores/useSessionStore';

/** What is sealed to the peer so they can fetch and decrypt the blob. Never seen by the server. */
export interface BlobRef {
  blobId: string;
  keyHex: string;
  nonceHex: string;
}

export async function uploadEncrypted(bytes: Uint8Array): Promise<BlobRef> {
  const token = useSessionStore.getState().serverToken;
  if (!token) throw new Error('no session');
  const key = randomBytes(32);
  const { nonce, ciphertext } = encryptSym(key, bytes, randomBytes);
  const { id } = await api.uploadBlob(token, ciphertext);
  return { blobId: id, keyHex: toHex(key), nonceHex: toHex(nonce) };
}

export async function downloadDecrypted(ref: BlobRef): Promise<Uint8Array> {
  const token = useSessionStore.getState().serverToken;
  if (!token) throw new Error('no session');
  const ciphertext = await api.downloadBlob(token, ref.blobId);
  return decryptSym(fromHex(ref.keyHex), fromHex(ref.nonceHex), ciphertext);
}
