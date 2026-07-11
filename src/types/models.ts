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

export type MessageKind =
  | 'text'
  | 'image'
  | 'voice'
  | 'document'
  | 'location'
  | 'contact'
  | 'poll'
  | 'sticker'
  | 'system';

export interface PollOption {
  id: ID;
  label: string;
  votes: number;
}

export interface Poll {
  question: string;
  options: PollOption[];
  multiple: boolean;
  totalVotes: number;
  votedOptionId?: ID;
}

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
  // Encrypted-blob reference for media received over the relay (downloaded + decrypted lazily).
  blob?: { blobId: string; keyHex: string; nonceHex: string };
  mime?: string;
  durationSec?: number;
  createdAt: ISO;
  status: DeliveryStatus;
  replyToId?: ID;
  reactions?: Reaction[];
  editedAt?: ISO;
  deleted?: boolean;
  fileName?: string;
  fileSize?: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  contactName?: string;
  contactUsername?: string;
  stickerId?: string;
  poll?: Poll;
  forwardedFrom?: string;
  starred?: boolean;
  pinned?: boolean;
  serverSeq?: number;
  // Set when the conversation has a disappearing timer: the message is removed locally once passed.
  expiresAt?: ISO;
}

export type StoryKind = 'image' | 'text';

export interface Story {
  id: ID;
  authorId: ID;
  kind: StoryKind;
  mediaUrl?: string;
  text?: string;
  background?: string;
  createdAt: ISO;
}

export interface StatusFeed {
  authorId: ID;
  stories: Story[];
  hasUnseen: boolean;
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
  archived?: boolean;
  verified?: boolean;
  // Disappearing-messages timer in seconds (0 or undefined = off). Messages sent while set are
  // removed from both devices once the timer passes.
  disappearSeconds?: number;
  // Set when this conversation is backed by the relay: the server conversation id and the peer's
  // handle (used to fetch the peer's prekey bundle when sending).
  serverId?: ID;
  peerUsername?: string;
}

export type ChannelKind = 'text' | 'announcement';

export interface Channel {
  id: ID;
  communityId: ID;
  name: string;
  kind: ChannelKind;
  unreadCount: number;
  // The group conversation that backs this channel (set in a live build); opening it opens that thread.
  conversationId?: ID;
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
