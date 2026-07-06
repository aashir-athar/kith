// On-device key storage. Secret keys live in expo-secure-store (iOS Keychain / Android
// Keystore), never in plain storage and never uploaded. Public keys are re-derived from secrets,
// so only secrets are persisted. The one-time-prekey secret batch is a small JSON map that fits
// under the secure-store per-value limit.

import { fromHex, toHex } from '@kith/shared';
import * as SecureStore from 'expo-secure-store';

const IK = 'kith.ik';
const IKDH = 'kith.ikdh';
const SPK = 'kith.spk';
const OPKS = 'kith.opks';
const SESSION = 'kith.session';

export interface StoredSession {
  token: string;
  userId: string;
  deviceId: string;
}

export async function saveIdentity(ikSecret: Uint8Array, ikDhSecret: Uint8Array): Promise<void> {
  await SecureStore.setItemAsync(IK, toHex(ikSecret));
  await SecureStore.setItemAsync(IKDH, toHex(ikDhSecret));
}

export async function loadIdentity(): Promise<{ ikSecret: Uint8Array; ikDhSecret: Uint8Array } | null> {
  const a = await SecureStore.getItemAsync(IK);
  const b = await SecureStore.getItemAsync(IKDH);
  if (!a || !b) return null;
  return { ikSecret: fromHex(a), ikDhSecret: fromHex(b) };
}

export async function saveSignedPreKey(id: string, secret: Uint8Array): Promise<void> {
  await SecureStore.setItemAsync(SPK, JSON.stringify({ id, secret: toHex(secret) }));
}

export async function loadSignedPreKey(): Promise<{ id: string; secret: Uint8Array } | null> {
  const raw = await SecureStore.getItemAsync(SPK);
  if (!raw) return null;
  const obj = JSON.parse(raw) as { id: string; secret: string };
  return { id: obj.id, secret: fromHex(obj.secret) };
}

export async function saveOneTimePreKeys(secretsHex: Record<string, string>): Promise<void> {
  await SecureStore.setItemAsync(OPKS, JSON.stringify(secretsHex));
}

export async function loadOneTimePreKeys(): Promise<Record<string, string>> {
  const raw = await SecureStore.getItemAsync(OPKS);
  return raw ? (JSON.parse(raw) as Record<string, string>) : {};
}

export async function saveSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION, JSON.stringify(session));
}

export async function loadSession(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION);
  return raw ? (JSON.parse(raw) as StoredSession) : null;
}

export async function clearAll(): Promise<void> {
  await Promise.all([IK, IKDH, SPK, OPKS, SESSION].map((k) => SecureStore.deleteItemAsync(k)));
}
