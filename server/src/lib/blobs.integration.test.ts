// Verifies relay blob storage against a temp directory: ciphertext round-trips, unknown ids return
// null, and non-UUID ids (path-traversal attempts) are rejected without touching the filesystem.

import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { deleteBlob, ensureBlobDir, readBlob, saveBlob } from './blobs';

async function withDir(fn: (root: string) => Promise<void>) {
  const root = join(tmpdir(), `kith-blobtest-${randomUUID()}`);
  await ensureBlobDir(root);
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('blob ciphertext round-trips and delete removes it', async () => {
  await withDir(async (root) => {
    const bytes = new Uint8Array(randomBytes(4096));
    const id = await saveBlob(bytes, root);
    const back = await readBlob(id, root);
    assert.ok(back);
    assert.deepEqual(new Uint8Array(back), bytes);
    await deleteBlob(id, root);
    assert.equal(await readBlob(id, root), null, 'gone after delete');
  });
});

test('unknown and malicious ids never leave the blob directory', async () => {
  await withDir(async (root) => {
    assert.equal(await readBlob(randomUUID(), root), null, 'unknown uuid -> null');
    // Path-traversal / arbitrary ids are rejected by the UUID guard, not read from disk.
    assert.equal(await readBlob('../../etc/passwd', root), null);
    assert.equal(await readBlob('not-a-uuid', root), null);
  });
});
