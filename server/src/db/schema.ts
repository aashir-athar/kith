// Kith relay schema. Zero-knowledge: message ciphertext is opaque `bytea`, routing metadata is
// `jsonb`, and no plaintext or secret key is ever stored. Only PUBLIC key material is persisted.
// Receipts use per-participant cursors (last_delivered_seq / last_read_seq) rather than a row
// per message, which scales. Per-conversation `next_seq` gives gap-detectable ordering.

import { bigint, boolean, customType, index, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/** Postgres bytea <-> Uint8Array. Drizzle core has no native bytea type. */
export const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value) {
    return Buffer.from(value);
  },
  fromDriver(value) {
    return new Uint8Array(value);
  },
});

export const users = pgTable(
  'users',
  {
    id: uuid().defaultRandom().primaryKey(),
    username: text().notNull(),
    displayName: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('users_username_idx').on(t.username)],
);

export const devices = pgTable(
  'devices',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ikPub: bytea().notNull(), // Ed25519 identity public (signing)
    ikDhPub: bytea().notNull(), // X25519 identity DH public
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('devices_user_idx').on(t.userId)],
);

export const signedPreKeys = pgTable(
  'signed_prekeys',
  {
    id: uuid().defaultRandom().primaryKey(),
    deviceId: uuid()
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    keyId: text().notNull(), // client-assigned id; the bundle returns this so the recipient finds its secret
    pub: bytea().notNull(),
    sig: bytea().notNull(), // Ed25519 signature over pub by the device identity key
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('spk_device_idx').on(t.deviceId, t.createdAt)],
);

export const oneTimePreKeys = pgTable(
  'one_time_prekeys',
  {
    id: uuid().defaultRandom().primaryKey(),
    deviceId: uuid()
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    keyId: text().notNull(),
    pub: bytea().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('opk_device_idx').on(t.deviceId)],
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid().defaultRandom().primaryKey(),
    kind: text().$type<'direct' | 'group'>().notNull(),
    dmKey: text(), // sorted member-pair key for direct convos (dedupe); null for groups
    name: text(),
    nextSeq: bigint({ mode: 'number' }).default(1).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('conversations_dm_idx').on(t.dmKey)],
);

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    lastReadSeq: bigint({ mode: 'number' }).default(0).notNull(),
    lastDeliveredSeq: bigint({ mode: 'number' }).default(0).notNull(),
    muted: boolean().default(false).notNull(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] }), index('participants_user_idx').on(t.userId)],
);

// Remote push tokens (Expo push tokens). Public routing handles, not secrets: they let the relay
// wake a device that is not connected. One row per device token; a token belongs to one user.
export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text().notNull(),
    platform: text(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('push_tokens_token_idx').on(t.token), index('push_tokens_user_idx').on(t.userId)],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid().defaultRandom().primaryKey(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    seq: bigint({ mode: 'number' }).notNull(), // monotonic per conversation
    senderUserId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    senderDeviceId: uuid()
      .notNull()
      .references(() => devices.id, { onDelete: 'restrict' }), // restrict: removing a device never erases history
    envelope: jsonb().$type<Record<string, unknown>>().notNull(), // routing metadata only (no plaintext, no keys)
    ciphertext: bytea().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    editedAt: timestamp({ withTimezone: true }), // set when the sender edits (re-seals) the message
    deleted: boolean().default(false).notNull(), // delete-for-everyone tombstone; ciphertext is wiped
  },
  // keyset pagination + gap detection both ride this composite unique index
  (t) => [uniqueIndex('messages_conv_seq_idx').on(t.conversationId, t.seq)],
);

// A community groups several channels. Each channel is backed by a group conversation, so channel
// messaging reuses the group end-to-end path; the community + channel rows are just the directory.
export const communities = pgTable('communities', {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const channels = pgTable(
  'channels',
  {
    id: uuid().defaultRandom().primaryKey(),
    communityId: uuid()
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('channels_community_idx').on(t.communityId)],
);

// One row per (blocker, blocked) pair. Enforced at delivery (the relay never forwards or pushes a
// blocked sender's traffic) and at read (blocked senders are excluded from history and sync).
export const blocks = pgTable(
  'blocks',
  {
    blockerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index('blocks_blocker_idx').on(t.blockerId)],
);
