// Redis connections. Two are required: one for commands/publishing, and a DEDICATED subscriber
// (ioredis in subscribe mode cannot issue normal commands). The subscriber is used by the WS
// gateway for cross-instance fan-out.

import Redis from 'ioredis';

import { env } from './env';

export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const redisSub = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
