// Kith relay server entrypoint. A zero-knowledge relay: it authenticates devices by their
// identity keys, distributes public prekey bundles, and forwards opaque ciphertext envelopes.
// It never sees plaintext or any secret key.

import 'dotenv/config';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { env } from './env';
import { startHeartbeat, wsRoute, wss } from './gateway';
import { ensureBlobDir } from './lib/blobs';
import { account } from './routes/account';
import { auth } from './routes/auth';
import { blobs } from './routes/blobs';
import { blocksRoute } from './routes/blocks';
import { conversationsRoute } from './routes/conversations';
import { keys } from './routes/keys';
import { push } from './routes/push';
import { rt } from './routes/rt';
import { usersRoute } from './routes/users';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'kith-server', ts: Date.now() }));

app.route('/auth', auth);
app.route('/keys', keys);
app.route('/rt', rt);
app.route('/conversations', conversationsRoute);
app.route('/users', usersRoute);
app.route('/account', account);
app.route('/push', push);
app.route('/blocks', blocksRoute);
app.route('/blobs', blobs);
app.get('/ws', wsRoute);

void ensureBlobDir();

const server = serve({ fetch: app.fetch, port: env.PORT, websocket: { server: wss } }, (info) => {
  console.log(`[kith-server] listening on http://localhost:${info.port} (${env.NODE_ENV})`);
});

const heartbeat = startHeartbeat();

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    console.log(`[kith-server] ${sig} received, shutting down`);
    clearInterval(heartbeat);
    server.close(() => process.exit(0));
  });
}

export { app };
