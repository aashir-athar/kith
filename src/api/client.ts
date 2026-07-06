// REST client for the Kith relay. Base URL comes from EXPO_PUBLIC_API_URL (set per environment:
// a LAN IP for a real device, 10.0.2.2 for the Android emulator, localhost for iOS simulator).

import type { MessageEnvelope, PreKeyBundle, RegisterRequest, SessionResponse } from '@kith/shared';

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

export interface ServerMessage {
  id: string;
  conversationId: string;
  seq: number;
  senderId: string;
  envelope: MessageEnvelope;
  createdAt: number;
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
  ticket: (token: string) => post<{ ticket: string; expiresAt: number }>('/rt/ticket', {}, token),
  createDirect: (token: string, username: string) => post<DirectConversation>('/conversations/direct', { username }, token),
  history: (token: string, conversationId: string, before?: number) =>
    get<{ messages: ServerMessage[] }>(`/conversations/${conversationId}/messages${before ? `?before=${before}` : ''}`, token),
};
