import { randomBytes, randomUUID } from 'node:crypto';

export const uuid = (): string => randomUUID();

/** URL-safe opaque token for sessions, tickets, and challenges. */
export const token = (bytes = 32): string => randomBytes(bytes).toString('base64url');
