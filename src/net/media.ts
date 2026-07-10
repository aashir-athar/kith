// Local file <-> encrypted blob bridge. Reads a picked file's bytes to encrypt and upload, and
// downloads + decrypts a received blob into the cache so it can be rendered from a file:// uri.
// The plaintext bytes only ever exist on device; the relay stores ciphertext.

import { File, Paths } from 'expo-file-system';

import { type BlobRef, downloadDecrypted, uploadEncrypted } from '@/net/blobs';

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  pdf: 'application/pdf',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
};

function mimeFromUri(uri: string, fallback: string): string {
  const ext = uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  return (ext && MIME_BY_EXT[ext]) || fallback;
}

/** Read a picked file, encrypt + upload it, and return the ref to seal plus display metadata. */
export async function uploadLocalMedia(uri: string, fallbackMime: string): Promise<{ ref: BlobRef; mime: string; size: number }> {
  const bytes = await new File(uri).bytes();
  const ref = await uploadEncrypted(bytes);
  return { ref, mime: mimeFromUri(uri, fallbackMime), size: bytes.length };
}

/** Download + decrypt a blob into the cache (once) and return its local file:// uri. An optional
 * name lets the cache file keep the original extension, which document viewers rely on. */
export async function downloadMediaToCache(blob: BlobRef, name?: string): Promise<string> {
  const ext = name?.split('.').pop();
  const cacheName = ext && ext.length > 0 && ext.length <= 5 ? `kith-${blob.blobId}.${ext}` : `kith-${blob.blobId}`;
  const file = new File(Paths.cache, cacheName);
  if (!file.exists) {
    const bytes = await downloadDecrypted(blob);
    file.write(bytes);
  }
  return file.uri;
}
