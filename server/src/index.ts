// Kith relay server entrypoint. A zero-knowledge relay: it authenticates devices by their
// identity keys, distributes public prekey bundles, and forwards opaque ciphertext envelopes.
// It never sees plaintext or any secret key.

import 'dotenv/config';

import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { env } from './env';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'kith-server', ts: Date.now() }));

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[kith-server] listening on http://localhost:${info.port} (${env.NODE_ENV})`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    console.log(`[kith-server] ${sig} received, shutting down`);
    server.close(() => process.exit(0));
  });
}

export { app };
