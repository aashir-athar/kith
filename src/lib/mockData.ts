// Seed data for the frontend-first build. Stands in for the crypto core + backend so every
// screen is real and navigable. Names and content are deliberately varied and human.

import type { CallRecord, Community, Conversation, Message, StatusFeed, Story, User } from '@/types/models';

const now = Date.now();
const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;
const iso = (agoMs: number): string => new Date(now - agoMs).toISOString();

export const me: User = {
  id: 'me',
  username: 'you',
  displayName: 'You',
  verified: true,
  bio: 'On Kith.',
};

const imani: User = { id: 'u_imani', username: 'imani', displayName: 'Imani Okafor', verified: true, bio: 'Investigative desk. Signal me, or Kith me.' };
const soren: User = { id: 'u_soren', username: 'soren', displayName: 'Søren Vestergaard' };
const priya: User = { id: 'u_priya', username: 'priya', displayName: 'Priya Raghunathan', verified: true };
const mateo: User = { id: 'u_mateo', username: 'mateo', displayName: 'Mateo Fuentes' };
const noa: User = { id: 'u_noa', username: 'noa', displayName: 'Noa Ben-Ami' };
const kwame: User = { id: 'u_kwame', username: 'kwame', displayName: 'Kwame Mensah' };
const lin: User = { id: 'u_lin', username: 'linwei', displayName: 'Lin Wei', verified: true };

export const users: readonly User[] = [imani, soren, priya, mateo, noa, kwame, lin];

export const usersById: Record<string, User> = Object.fromEntries(
  [me, ...users].map((u) => [u.id, u]),
);

const CONV_IMANI = 'c_imani';
const CONV_DESK = 'c_desk';
const CONV_PRIYA = 'c_priya';
const CONV_MATEO = 'c_mateo';
const CONV_NOA = 'c_noa';
const CONV_KWAME = 'c_kwame';

export const conversations: Conversation[] = [
  { id: CONV_IMANI, kind: 'direct', participantIds: [me.id, imani.id], lastMessagePreview: 'Sending the files now. All encrypted.', lastMessageAt: iso(3 * MIN), unreadCount: 2, pinned: true, muted: false, encrypted: true },
  { id: CONV_DESK, kind: 'group', title: 'The Desk', participantIds: [me.id, imani.id, priya.id, lin.id], lastMessagePreview: 'Priya: pushed the draft, take a look', lastMessageAt: iso(22 * MIN), unreadCount: 5, pinned: true, muted: false, encrypted: true },
  { id: CONV_PRIYA, kind: 'direct', participantIds: [me.id, priya.id], lastMessagePreview: 'You: sounds good, talk tomorrow', lastMessageAt: iso(2 * HR), unreadCount: 0, pinned: false, muted: false, encrypted: true },
  { id: CONV_MATEO, kind: 'direct', participantIds: [me.id, mateo.id], lastMessagePreview: 'Voice message', lastMessageAt: iso(6 * HR), unreadCount: 0, pinned: false, muted: false, encrypted: true },
  { id: CONV_NOA, kind: 'direct', participantIds: [me.id, noa.id], lastMessagePreview: 'Photo', lastMessageAt: iso(1 * DAY), unreadCount: 0, pinned: false, muted: true, encrypted: true },
  { id: CONV_KWAME, kind: 'direct', participantIds: [me.id, kwame.id], lastMessagePreview: 'Happy to help, whenever', lastMessageAt: iso(3 * DAY), unreadCount: 0, pinned: false, muted: false, encrypted: true },
];

export const messagesByConversation: Record<string, Message[]> = {
  [CONV_IMANI]: [
    { id: 'm1', conversationId: CONV_IMANI, senderId: imani.id, kind: 'text', text: 'Hey, are you around this evening?', createdAt: iso(48 * MIN), status: 'read' },
    { id: 'm2', conversationId: CONV_IMANI, senderId: me.id, kind: 'text', text: 'Yeah, until about nine. What do you need?', createdAt: iso(46 * MIN), status: 'read' },
    { id: 'm3', conversationId: CONV_IMANI, senderId: imani.id, kind: 'text', text: 'Reviewing the source docs before we publish. Can you take the second half?', createdAt: iso(44 * MIN), status: 'read', reactions: [{ key: 'thumbsup', userIds: [me.id] }] },
    { id: 'm4', conversationId: CONV_IMANI, senderId: me.id, kind: 'text', text: 'Of course. Send them over.', createdAt: iso(40 * MIN), status: 'read' },
    { id: 'm5', conversationId: CONV_IMANI, senderId: imani.id, kind: 'text', text: 'Sending the files now. All encrypted.', createdAt: iso(3 * MIN), status: 'delivered' },
    { id: 'm6', conversationId: CONV_IMANI, senderId: imani.id, kind: 'text', text: 'Let me know when you have them.', createdAt: iso(3 * MIN), status: 'delivered' },
  ],
  [CONV_DESK]: [
    { id: 'd1', conversationId: CONV_DESK, senderId: lin.id, kind: 'text', text: 'Morning all. Status on the piece?', createdAt: iso(3 * HR), status: 'read' },
    { id: 'd2', conversationId: CONV_DESK, senderId: priya.id, kind: 'text', text: 'Second pass done. Cutting 200 words.', createdAt: iso(2 * HR), status: 'read' },
    { id: 'd3', conversationId: CONV_DESK, senderId: me.id, kind: 'text', text: 'I can fact-check the timeline this afternoon.', createdAt: iso(90 * MIN), status: 'read' },
    { id: 'd4', conversationId: CONV_DESK, senderId: priya.id, kind: 'text', text: 'pushed the draft, take a look', createdAt: iso(22 * MIN), status: 'delivered' },
    { id: 'd5', conversationId: CONV_DESK, senderId: lin.id, kind: 'poll', createdAt: iso(18 * MIN), status: 'delivered', poll: { question: 'Publish time?', multiple: false, totalVotes: 3, options: [{ id: 'o1', label: 'Tonight', votes: 2 }, { id: 'o2', label: 'Tomorrow morning', votes: 1 }, { id: 'o3', label: 'Hold for legal', votes: 0 }] } },
  ],
  [CONV_PRIYA]: [
    { id: 'p1', conversationId: CONV_PRIYA, senderId: priya.id, kind: 'text', text: 'Are we still on for the call tomorrow?', createdAt: iso(3 * HR), status: 'read' },
    { id: 'p2', conversationId: CONV_PRIYA, senderId: me.id, kind: 'text', text: 'sounds good, talk tomorrow', createdAt: iso(2 * HR), status: 'read' },
  ],
  [CONV_KWAME]: [
    { id: 'k1', conversationId: CONV_KWAME, senderId: kwame.id, kind: 'text', text: 'Happy to help, whenever', createdAt: iso(3 * DAY), status: 'read' },
  ],
  [CONV_MATEO]: [
    { id: 'ma1', conversationId: CONV_MATEO, senderId: mateo.id, kind: 'text', text: 'Sent you the spot for tomorrow', createdAt: iso(7 * HR), status: 'read' },
    { id: 'ma2', conversationId: CONV_MATEO, senderId: mateo.id, kind: 'location', latitude: 51.5079, longitude: -0.0877, locationLabel: 'London Bridge', createdAt: iso(7 * HR), status: 'read' },
    { id: 'ma3', conversationId: CONV_MATEO, senderId: me.id, kind: 'image', mediaUrl: 'la3', createdAt: iso(6 * HR + 30 * MIN), status: 'read' },
    { id: 'ma4', conversationId: CONV_MATEO, senderId: mateo.id, kind: 'document', fileName: 'Field-notes.pdf', fileSize: '2.4 MB', createdAt: iso(6 * HR + 12 * MIN), status: 'read' },
    { id: 'ma5', conversationId: CONV_MATEO, senderId: mateo.id, kind: 'voice', durationSec: 34, createdAt: iso(6 * HR), status: 'delivered' },
  ],
};

export const communities: Community[] = [
  {
    id: 'com_press',
    name: 'Frontline Press',
    description: 'A vetted room for working journalists. Encrypted, invite-only.',
    memberCount: 1284,
    accentSeed: 'frontline-press',
    channels: [
      { id: 'ch_press_announce', communityId: 'com_press', name: 'announcements', kind: 'announcement', unreadCount: 1 },
      { id: 'ch_press_general', communityId: 'com_press', name: 'general', kind: 'text', unreadCount: 12 },
      { id: 'ch_press_tips', communityId: 'com_press', name: 'secure-tips', kind: 'text', unreadCount: 0 },
    ],
  },
  {
    id: 'com_legal',
    name: 'Rights & Counsel',
    description: 'Human rights lawyers coordinating casework.',
    memberCount: 342,
    accentSeed: 'rights-counsel',
    channels: [
      { id: 'ch_legal_general', communityId: 'com_legal', name: 'general', kind: 'text', unreadCount: 3 },
      { id: 'ch_legal_intake', communityId: 'com_legal', name: 'intake', kind: 'text', unreadCount: 0 },
    ],
  },
];

export const calls: CallRecord[] = [
  { id: 'call1', peerId: imani.id, kind: 'video', direction: 'incoming', startedAt: iso(2 * HR), durationSec: 742 },
  { id: 'call2', peerId: priya.id, kind: 'audio', direction: 'outgoing', startedAt: iso(1 * DAY), durationSec: 133 },
  { id: 'call3', peerId: mateo.id, kind: 'audio', direction: 'missed', startedAt: iso(2 * DAY) },
  { id: 'call4', peerId: lin.id, kind: 'video', direction: 'outgoing', startedAt: iso(4 * DAY), durationSec: 2841 },
];

export function conversationTitle(conversation: Conversation): string {
  if (conversation.title) return conversation.title;
  const otherId = conversation.participantIds.find((pid) => pid !== me.id);
  return (otherId ? usersById[otherId]?.displayName : undefined) ?? 'Unknown';
}

export function conversationPeer(conversation: Conversation): User | undefined {
  const otherId = conversation.participantIds.find((pid) => pid !== me.id);
  return otherId ? usersById[otherId] : undefined;
}

export const myStories: Story[] = [
  { id: 's_me1', authorId: me.id, kind: 'text', text: 'Shipping something new soon.', background: '#221F26', createdAt: iso(2 * HR) },
];

export const statusFeeds: StatusFeed[] = [
  {
    authorId: imani.id,
    hasUnseen: true,
    stories: [
      { id: 'st_im1', authorId: imani.id, kind: 'image', mediaUrl: 'imani-1', createdAt: iso(1 * HR) },
      { id: 'st_im2', authorId: imani.id, kind: 'text', text: 'Story time. Off the record.', background: '#1E2740', createdAt: iso(40 * MIN) },
    ],
  },
  {
    authorId: priya.id,
    hasUnseen: true,
    stories: [{ id: 'st_pr1', authorId: priya.id, kind: 'image', mediaUrl: 'priya-1', createdAt: iso(3 * HR) }],
  },
  {
    authorId: lin.id,
    hasUnseen: false,
    stories: [{ id: 'st_lin1', authorId: lin.id, kind: 'image', mediaUrl: 'lin-1', createdAt: iso(9 * HR) }],
  },
  {
    authorId: kwame.id,
    hasUnseen: false,
    stories: [{ id: 'st_kw1', authorId: kwame.id, kind: 'text', text: 'Grateful today.', background: '#33401E', createdAt: iso(10 * HR) }],
  },
];
