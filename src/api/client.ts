// REST client for the Kith relay. Base URL comes from EXPO_PUBLIC_API_URL (set per environment:
// a LAN IP for a real device, 10.0.2.2 for the Android emulator, localhost for iOS simulator).

import type { ConversationSummary, MessageDTO, PreKeyBundle, RegisterRequest, RotateKeysRequest, SessionResponse, UserPublic } from '@kith/shared';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

async function get<T>(path: string, token: string): Promise<T> {
  const res = await fetch(BASE + path, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

async function del<T>(path: string, token: string): Promise<T> {
  const res = await fetch(BASE + path, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`DELETE ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

export interface DirectConversation {
  id: string;
  kind: string;
  participants: string[];
}

export const api = {
  wsUrl: (ticket: string) => `${BASE.replace(/^http/, 'ws')}/ws?ticket=${encodeURIComponent(ticket)}`,
  register: (body: RegisterRequest) => post<SessionResponse>('/auth/register', body),
  challenge: (username: string) => post<{ challenge: string; expiresAt: number }>('/auth/challenge', { username }),
  verify: (body: { username: string; challenge: string; signature: string }) => post<SessionResponse>('/auth/verify', body),
  bundle: (token: string, username: string) => get<PreKeyBundle>(`/keys/bundle/${encodeURIComponent(username)}`, token),
  replenish: (token: string, oneTimePreKeys: { id: string; pub: string }[]) =>
    post<{ ok: boolean }>('/keys/replenish', { oneTimePreKeys }, token),
  rotateKeys: (token: string, body: RotateKeysRequest) => post<{ ok: boolean }>('/keys/rotate', body, token),
  ticket: (token: string) => post<{ ticket: string; expiresAt: number }>('/rt/ticket', {}, token),
  createDirect: (token: string, username: string) => post<DirectConversation>('/conversations/direct', { username }, token),
  createGroup: (token: string, name: string, usernames: string[]) =>
    post<{ id: string; kind: string; name: string; participants: UserPublic[] }>('/conversations/group', { name, usernames }, token),
  listConversations: (token: string) => get<{ conversations: ConversationSummary[] }>('/conversations', token),
  history: (token: string, conversationId: string, before?: number) =>
    get<{ messages: MessageDTO[] }>(`/conversations/${conversationId}/messages${before ? `?before=${before}` : ''}`, token),
  user: (token: string, id: string) => get<UserPublic>(`/users/${encodeURIComponent(id)}`, token),
  lookupUser: (token: string, username: string) => get<UserPublic>(`/users/lookup/${encodeURIComponent(username)}`, token),
  deleteAccount: (token: string) => del<{ ok: boolean }>('/account', token),
  registerPush: (authToken: string, pushToken: string, platform: string) =>
    post<{ ok: boolean }>('/push/register', { token: pushToken, platform }, authToken),
  unregisterPush: (authToken: string, pushToken: string) => post<{ ok: boolean }>('/push/unregister', { token: pushToken }, authToken),
  uploadBlob: async (token: string, ciphertext: Uint8Array): Promise<{ id: string }> => {
    const res = await fetch(BASE + '/blobs', {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream', authorization: `Bearer ${token}` },
      body: ciphertext as unknown as BodyInit,
    });
    if (!res.ok) throw new Error(`POST /blobs -> ${res.status}`);
    return (await res.json()) as { id: string };
  },
  downloadBlob: async (token: string, id: string): Promise<Uint8Array> => {
    const res = await fetch(`${BASE}/blobs/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`GET /blobs/${id} -> ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  },
  block: (token: string, username: string) => post<{ ok: boolean }>('/blocks/block', { username }, token),
  unblock: (token: string, username: string) => post<{ ok: boolean }>('/blocks/unblock', { username }, token),
  listBlocked: (token: string) => get<{ blocked: UserPublic[] }>('/blocks', token),
  setMute: (token: string, conversationId: string, muted: boolean) => post<{ ok: boolean }>(`/conversations/${conversationId}/mute`, { muted }, token),
};
