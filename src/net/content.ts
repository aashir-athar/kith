// The decrypted payload of a message. Everything a peer sends is a sealed Content object, so the
// relay only ever sees ciphertext: a chat message, or a control op (reaction, pin) that references
// an earlier message by its sequence number. Control ops use set-semantics (add vs remove / a bool)
// so replaying them on reconnect or history load is idempotent.

export type MediaKind = 'image' | 'voice' | 'document';

export type Content =
  | { t: 'text'; body: string; replyToSeq?: number; expiresInSec?: number }
  | { t: 'reaction'; targetSeq: number; key: string; remove: boolean }
  | { t: 'pin'; targetSeq: number; pinned: boolean }
  | { t: 'timer'; seconds: number }
  // Blob-backed: only the ref (id + key + nonce) is sealed; the ciphertext lives on the relay.
  | { t: 'media'; mediaKind: MediaKind; blobId: string; keyHex: string; nonceHex: string; mime: string; name?: string; size?: number; durationSec?: number }
  | { t: 'sticker'; stickerId: string }
  | { t: 'location'; label: string; latitude: number; longitude: number }
  | { t: 'contact'; name: string; username?: string }
  | { t: 'poll'; question: string; options: string[] };

export function encodeContent(content: Content): string {
  return JSON.stringify(content);
}

/** Parse a decrypted payload. Anything unrecognized is treated as a plain text body, so a malformed
 * or future-shaped payload degrades to a readable message rather than throwing. */
export function decodeContent(raw: string): Content {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o.t === 'reaction' && typeof o.targetSeq === 'number' && typeof o.key === 'string') {
      return { t: 'reaction', targetSeq: o.targetSeq, key: o.key, remove: o.remove === true };
    }
    if (o.t === 'pin' && typeof o.targetSeq === 'number' && typeof o.pinned === 'boolean') {
      return { t: 'pin', targetSeq: o.targetSeq, pinned: o.pinned };
    }
    if (o.t === 'timer' && typeof o.seconds === 'number') {
      return { t: 'timer', seconds: o.seconds };
    }
    if (o.t === 'media' && (o.mediaKind === 'image' || o.mediaKind === 'voice' || o.mediaKind === 'document') && typeof o.blobId === 'string' && typeof o.keyHex === 'string' && typeof o.nonceHex === 'string' && typeof o.mime === 'string') {
      return {
        t: 'media',
        mediaKind: o.mediaKind,
        blobId: o.blobId,
        keyHex: o.keyHex,
        nonceHex: o.nonceHex,
        mime: o.mime,
        name: typeof o.name === 'string' ? o.name : undefined,
        size: typeof o.size === 'number' ? o.size : undefined,
        durationSec: typeof o.durationSec === 'number' ? o.durationSec : undefined,
      };
    }
    if (o.t === 'sticker' && typeof o.stickerId === 'string') {
      return { t: 'sticker', stickerId: o.stickerId };
    }
    if (o.t === 'location' && typeof o.label === 'string' && typeof o.latitude === 'number' && typeof o.longitude === 'number') {
      return { t: 'location', label: o.label, latitude: o.latitude, longitude: o.longitude };
    }
    if (o.t === 'contact' && typeof o.name === 'string') {
      return { t: 'contact', name: o.name, username: typeof o.username === 'string' ? o.username : undefined };
    }
    if (o.t === 'poll' && typeof o.question === 'string' && Array.isArray(o.options)) {
      return { t: 'poll', question: o.question, options: o.options.filter((x): x is string => typeof x === 'string') };
    }
    if (o.t === 'text' && typeof o.body === 'string') {
      return {
        t: 'text',
        body: o.body,
        replyToSeq: typeof o.replyToSeq === 'number' ? o.replyToSeq : undefined,
        expiresInSec: typeof o.expiresInSec === 'number' ? o.expiresInSec : undefined,
      };
    }
  } catch {
    // not JSON: fall through to the text fallback
  }
  return { t: 'text', body: raw };
}
