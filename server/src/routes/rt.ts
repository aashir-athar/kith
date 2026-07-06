// Realtime tickets. The client redeems the bearer token here for a single-use ticket, then
// opens the WebSocket with ?ticket=... (browsers cannot set custom WS headers).

import { Hono } from 'hono';

import { mintTicket } from '../lib/session';
import { requireAuth, type AuthEnv } from '../middleware/auth';

export const rt = new Hono<AuthEnv>();
rt.use('*', requireAuth);

rt.post('/ticket', async (c) => c.json(await mintTicket(c.get('session'))));
