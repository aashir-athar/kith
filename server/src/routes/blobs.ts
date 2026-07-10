// Encrypted media transfer. Authenticated: upload opaque ciphertext (raw octet-stream) and get an
// id back; download ciphertext by id. The server never sees the key, so it never sees the media.

import { Hono } from 'hono';

import { env } from '../env';
import { readBlob, saveBlob } from '../lib/blobs';
import { requireAuth, type AuthEnv } from '../middleware/auth';

export const blobs = new Hono<AuthEnv>();
blobs.use('*', requireAuth);

blobs.post('/', async (c) => {
  const buf = await c.req.arrayBuffer();
  if (buf.byteLength === 0) return c.json({ error: 'empty' }, 400);
  if (buf.byteLength > env.BLOB_MAX_BYTES) return c.json({ error: 'too large' }, 413);
  const id = await saveBlob(new Uint8Array(buf));
  return c.json({ id });
});

blobs.get('/:id', async (c) => {
  const bytes = await readBlob(c.req.param('id'));
  if (!bytes) return c.json({ error: 'not found' }, 404);
  return new Response(new Uint8Array(bytes), { headers: { 'content-type': 'application/octet-stream' } });
});
