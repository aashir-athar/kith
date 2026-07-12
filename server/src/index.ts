// Kith relay server entrypoint. A zero-knowledge relay: it authenticates devices by their
// identity keys, distributes public prekey bundles, and forwards opaque ciphertext envelopes.
// It never sees plaintext or any secret key.

import 'dotenv/config';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { env } from './env';
import { startHeartbeat, wsRoute, wss } from './gateway';
import { ensureBlobDir } from './lib/blobs';
import { account } from './routes/account';
import { auth } from './routes/auth';
import { blobs } from './routes/blobs';
import { blocksRoute } from './routes/blocks';
import { communitiesRoute } from './routes/communities';
import { conversationsRoute } from './routes/conversations';
import { keys } from './routes/keys';
import { push } from './routes/push';
import { rt } from './routes/rt';
import { usersRoute } from './routes/users';

const app = new Hono();

if (env.NODE_ENV === 'production' && process.env.CORS_ORIGIN == null) {
  console.warn(
    '[kith-server] CORS_ORIGIN is unset in production; only http://localhost:3000 is allowed, so browser clients from your real web origin will be blocked. Set CORS_ORIGIN to the web app origin.',
  );
}

// The browser web client is a different origin from the relay, so it needs CORS on the REST routes.
// Bearer tokens travel in the Authorization header (no cookies), so no credentials mode is required.
app.use(
  '*',
  cors({
    origin: env.CORS_ORIGIN,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  }),
);

app.get('/health', (c) => c.json({ ok: true, service: 'kith-server', ts: Date.now() }));

app.route('/auth', auth);
app.route('/keys', keys);
app.route('/rt', rt);
app.route('/conversations', conversationsRoute);
app.route('/communities', communitiesRoute);
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
