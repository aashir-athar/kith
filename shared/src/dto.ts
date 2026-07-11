// REST DTOs. Auth is passwordless and key-based: the client proves control of its Ed25519
// identity key by signing a server challenge. Message send/receive happens over the socket.

import { z } from 'zod';

import { b64, WireEnvelope } from './envelope';
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

/** Replace this device's prekey material wholesale. Used after a phrase-restore on a new device,
 * where the old signed/one-time prekey secrets are gone, so the server must be handed a fresh set. */
export const RotateKeysRequest = z.object({
  spk: SignedPreKey,
  oneTimePreKeys: z.array(OneTimePreKey).min(1).max(200),
});
export type RotateKeysRequest = z.infer<typeof RotateKeysRequest>;

/** Register or drop a remote push token (Expo push token) for the authenticated device. */
export const PushRegisterRequest = z.object({
  token: z.string().min(1).max(256),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});
export type PushRegisterRequest = z.infer<typeof PushRegisterRequest>;

export const UserPublic = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
});
export type UserPublic = z.infer<typeof UserPublic>;

/** One stored message on the wire. Same shape for REST history and the socket 'message' frame. */
export const MessageDTO = z.object({
  id: z.string(),
  conversationId: z.string(),
  seq: z.number(),
  senderId: z.string(),
  envelope: WireEnvelope,
  createdAt: z.number(),
  editedAt: z.number().nullable().optional(),
  deleted: z.boolean().optional(),
});
export type MessageDTO = z.infer<typeof MessageDTO>;

export const HistoryResponse = z.object({ messages: z.array(MessageDTO) });
export type HistoryResponse = z.infer<typeof HistoryResponse>;

/** A conversation as it appears in the caller's list, with peer identity and cursors. */
export const ConversationSummary = z.object({
  id: z.string(),
  kind: z.enum(['direct', 'group']),
  name: z.string().nullable(), // group name (null for direct)
  peer: UserPublic.nullable(), // the other member (direct only; first other member for groups)
  members: z.array(UserPublic), // all other participants (used to seal group messages and render)
  lastMessage: MessageDTO.nullable(),
  unreadCount: z.number(),
  peerLastReadSeq: z.number(),
  peerLastDeliveredSeq: z.number(),
});
export type ConversationSummary = z.infer<typeof ConversationSummary>;

export const ConversationListResponse = z.object({ conversations: z.array(ConversationSummary) });
export type ConversationListResponse = z.infer<typeof ConversationListResponse>;

/** A channel is backed by a group conversation; opening it opens that conversation's thread. */
export const ChannelDTO = z.object({ id: z.string(), conversationId: z.string(), name: z.string() });
export type ChannelDTO = z.infer<typeof ChannelDTO>;

export const CommunityDTO = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  memberCount: z.number(),
  channels: z.array(ChannelDTO),
});
export type CommunityDTO = z.infer<typeof CommunityDTO>;

export const CommunityListResponse = z.object({ communities: z.array(CommunityDTO) });
export type CommunityListResponse = z.infer<typeof CommunityListResponse>;

export const CreateCommunityRequest = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(280).optional(),
  usernames: z.array(z.string()).min(1),
  channels: z.array(z.string().min(1).max(40)).max(20).optional(),
});
export type CreateCommunityRequest = z.infer<typeof CreateCommunityRequest>;

export const DirectConversationResponse = z.object({
  id: z.string(),
  kind: z.string(),
  participants: z.array(z.string()),
});
export type DirectConversationResponse = z.infer<typeof DirectConversationResponse>;
