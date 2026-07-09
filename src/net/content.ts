// The decrypted payload of a message. Everything a peer sends is a sealed Content object, so the
// relay only ever sees ciphertext: a chat message, or a control op (reaction, pin) that references
// an earlier message by its sequence number. Control ops use set-semantics (add vs remove / a bool)
// so replaying them on reconnect or history load is idempotent.

export type Content =
  | { t: 'text'; body: string; replyToSeq?: number }
  | { t: 'reaction'; targetSeq: number; key: string; remove: boolean }
  | { t: 'pin'; targetSeq: number; pinned: boolean };

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
    if (o.t === 'text' && typeof o.body === 'string') {
      return { t: 'text', body: o.body, replyToSeq: typeof o.replyToSeq === 'number' ? o.replyToSeq : undefined };
    }
  } catch {
    // not JSON: fall through to the text fallback
  }
  return { t: 'text', body: raw };
}
