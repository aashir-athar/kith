// On-device key storage for the web client, backed by localStorage. Same interface as the mobile
// keystore so the shared e2e layer is identical. Honest caveat: a browser has no secure enclave, so
// these secrets are readable by any script that runs on the page (XSS) - weaker than the phone's
// Keychain / Keystore. This is the deliberate tradeoff of a pure web client for an E2E app.

import { fromHex, toHex } from '@kith/shared';

import { randomBytes } from './random';

const IK = 'kith.ik';
const IKDH = 'kith.ikdh';
const SPK = 'kith.spk';
const OPKS = 'kith.opks';
const SESSION = 'kith.session';
const DEK = 'kith.dek';
const MNEMONIC = 'kith.mnemonic';

const get = (k: string): string | null => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
const set = (k: string, v: string): void => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
};
const del = (k: string): void => {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
};

export interface StoredSession {
  token: string;
  userId: string;
  deviceId: string;
}

export async function getOrCreateDataKey(): Promise<Uint8Array> {
  const existing = get(DEK);
  if (existing) return fromHex(existing);
  const key = randomBytes(32);
  set(DEK, toHex(key));
  return key;
}

export async function saveMnemonic(mnemonic: string): Promise<void> {
  set(MNEMONIC, mnemonic);
}

export async function loadMnemonic(): Promise<string | null> {
  return get(MNEMONIC);
}

export async function saveIdentity(ikSecret: Uint8Array, ikDhSecret: Uint8Array): Promise<void> {
  set(IK, toHex(ikSecret));
  set(IKDH, toHex(ikDhSecret));
}

export async function loadIdentity(): Promise<{ ikSecret: Uint8Array; ikDhSecret: Uint8Array } | null> {
  const a = get(IK);
  const b = get(IKDH);
  if (!a || !b) return null;
  return { ikSecret: fromHex(a), ikDhSecret: fromHex(b) };
}

export async function saveSignedPreKey(id: string, secret: Uint8Array): Promise<void> {
  set(SPK, JSON.stringify({ id, secret: toHex(secret) }));
}

export async function loadSignedPreKey(): Promise<{ id: string; secret: Uint8Array } | null> {
  const raw = get(SPK);
  if (!raw) return null;
  const obj = JSON.parse(raw) as { id: string; secret: string };
  return { id: obj.id, secret: fromHex(obj.secret) };
}

export async function saveOneTimePreKeys(secretsHex: Record<string, string>): Promise<void> {
  set(OPKS, JSON.stringify(secretsHex));
}

export async function loadOneTimePreKeys(): Promise<Record<string, string>> {
  const raw = get(OPKS);
  return raw ? (JSON.parse(raw) as Record<string, string>) : {};
}

export async function saveSession(session: StoredSession): Promise<void> {
  set(SESSION, JSON.stringify(session));
}

export async function loadSession(): Promise<StoredSession | null> {
  const raw = get(SESSION);
  return raw ? (JSON.parse(raw) as StoredSession) : null;
}

export async function clearAll(): Promise<void> {
  [IK, IKDH, SPK, OPKS, SESSION, DEK, MNEMONIC].forEach(del);
}
