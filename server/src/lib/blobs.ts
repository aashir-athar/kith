// Relay-hosted media storage. Only CIPHERTEXT is written to disk: the client encrypts a file with a
// per-blob key that travels end-to-end in the sealed message, so the relay stores opaque bytes and
// can never read them. Ids are random UUIDs and every read validates the id, so a request can never
// escape the blob directory.

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { env } from '../env';

const ROOT = resolve(env.BLOB_DIR);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function ensureBlobDir(root: string = ROOT): Promise<void> {
  await mkdir(root, { recursive: true });
}

/** Path inside `root` for a validated id, or null if the id is not a UUID (blocks path traversal). */
function pathFor(id: string, root: string): string | null {
  if (!UUID_RE.test(id)) return null;
  return join(root, id);
}

export async function saveBlob(bytes: Uint8Array, root: string = ROOT): Promise<string> {
  await mkdir(root, { recursive: true });
  const id = randomUUID();
  await writeFile(join(root, id), bytes);
  return id;
}

export async function readBlob(id: string, root: string = ROOT): Promise<Buffer | null> {
  const p = pathFor(id, root);
  if (!p) return null;
  try {
    return await readFile(p);
  } catch {
    return null;
  }
}

export async function deleteBlob(id: string, root: string = ROOT): Promise<void> {
  const p = pathFor(id, root);
  if (!p) return;
  try {
    await unlink(p);
  } catch {
    // already gone
  }
}
