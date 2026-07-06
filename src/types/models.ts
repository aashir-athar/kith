// Domain models for the Kith frontend. These are UI-facing shapes; the crypto core and
// backend will produce/consume compatible records later (ids are ULIDs, times are ISO).

export type ID = string;
export type ISO = string;

export interface User {
  id: ID;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  verified?: boolean;
}

export type Presence = 'online' | 'recently' | 'offline';

export type DeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type MessageKind = 'text' | 'image' | 'voice' | 'system';

export interface Reaction {
  key: string;
  userIds: ID[];
}

export interface Message {
  id: ID;
  conversationId: ID;
  senderId: ID;
  kind: MessageKind;
  text?: string;
  mediaUrl?: string;
  durationSec?: number;
  createdAt: ISO;
  status: DeliveryStatus;
  replyToId?: ID;
  reactions?: Reaction[];
  editedAt?: ISO;
}

export type ConversationKind = 'direct' | 'group';

export interface Conversation {
  id: ID;
  kind: ConversationKind;
  title?: string;
  participantIds: ID[];
  lastMessagePreview?: string;
  lastMessageAt?: ISO;
  unreadCount: number;
  pinned: boolean;
  muted: boolean;
  encrypted: boolean;
}

export type ChannelKind = 'text' | 'announcement';

export interface Channel {
  id: ID;
  communityId: ID;
  name: string;
  kind: ChannelKind;
  unreadCount: number;
}

export interface Community {
  id: ID;
  name: string;
  description: string;
  memberCount: number;
  accentSeed: string;
  channels: Channel[];
}

export type CallKind = 'audio' | 'video';
export type CallDirection = 'incoming' | 'outgoing' | 'missed';

export interface CallRecord {
  id: ID;
  peerId: ID;
  kind: CallKind;
  direction: CallDirection;
  startedAt: ISO;
  durationSec?: number;
}
