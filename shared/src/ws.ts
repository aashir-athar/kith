// WebSocket frames. Every inbound frame is validated against these before the gateway acts on
// it (WS frames are untrusted input). Server assigns a monotonic per-conversation `seq` so the
// client can detect gaps and resync.

import { z } from 'zod';

import { MessageEnvelope } from './envelope';

export const ClientFrame = z.discriminatedUnion('t', [
  z.object({ t: z.literal('send'), conversationId: z.string(), clientId: z.string(), envelope: MessageEnvelope }),
  z.object({ t: z.literal('edit'), conversationId: z.string(), targetSeq: z.number().int().nonnegative(), envelope: MessageEnvelope }),
  z.object({ t: z.literal('delete'), conversationId: z.string(), targetSeq: z.number().int().nonnegative() }),
  z.object({ t: z.literal('delivered'), conversationId: z.string(), seq: z.number().int().nonnegative() }),
  z.object({ t: z.literal('read'), conversationId: z.string(), seq: z.number().int().nonnegative() }),
  z.object({ t: z.literal('typing'), conversationId: z.string() }),
  z.object({ t: z.literal('sync'), conversationId: z.string(), afterSeq: z.number().int().nonnegative() }),
  z.object({ t: z.literal('ping') }),
]);
export type ClientFrame = z.infer<typeof ClientFrame>;

export const ServerFrame = z.discriminatedUnion('t', [
  z.object({
    t: z.literal('message'),
    conversationId: z.string(),
    seq: z.number().int().nonnegative(),
    id: z.string(),
    senderId: z.string(),
    envelope: MessageEnvelope,
    createdAt: z.number(),
  }),
  z.object({ t: z.literal('sent'), clientId: z.string(), id: z.string(), conversationId: z.string(), seq: z.number(), createdAt: z.number() }),
  z.object({ t: z.literal('edited'), conversationId: z.string(), seq: z.number(), envelope: MessageEnvelope, editedAt: z.number() }),
  z.object({ t: z.literal('deleted'), conversationId: z.string(), seq: z.number() }),
  z.object({
    t: z.literal('receipt'),
    conversationId: z.string(),
    seq: z.number(),
    userId: z.string(),
    kind: z.enum(['delivered', 'read']),
  }),
  z.object({ t: z.literal('typing'), conversationId: z.string(), userId: z.string() }),
  z.object({ t: z.literal('presence'), userId: z.string(), online: z.boolean() }),
  z.object({ t: z.literal('pong') }),
  z.object({ t: z.literal('error'), message: z.string() }),
]);
export type ServerFrame = z.infer<typeof ServerFrame>;
