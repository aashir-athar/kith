// Validates the shared X3DH-lite crypto end-to-end on Node (node CSPRNG injected). The same
// @noble primitives run on the RN client, so a green run here means the client math is correct.

import assert from 'node:assert/strict';
import { randomBytes as nodeRandomBytes } from 'node:crypto';
import { test } from 'node:test';

import {
  envelopeFromWire,
  envelopeToWire,
  generateIdentity,
  generateX25519,
  identityFromSeed,
  open,
  type PreKeyBundleBytes,
  type RecipientKeys,
  safetyNumber,
  seal,
  type SenderIdentity,
  signPreKey,
} from '@kith/shared';

const rnd = (n: number) => new Uint8Array(nodeRandomBytes(n));
const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

function setupRecipient() {
  const id = generateIdentity(rnd);
  const spk = generateX25519(rnd);
  const spkId = 'spk-1';
  const spkSig = signPreKey(spk.pub, id.ikSecret);
  const opk = generateX25519(rnd);
  const opkId = 'opk-1';
  const bundle: PreKeyBundleBytes = { ikPub: id.ikPub, ikDhPub: id.ikDhPub, spkId, spkPub: spk.pub, spkSig, opk: { id: opkId, pub: opk.pub } };
  const keys: RecipientKeys = {
    ikDhSecret: id.ikDhSecret,
    spkSecret: (q) => (q === spkId ? spk.secret : undefined),
    opkSecret: (q) => (q === opkId ? opk.secret : undefined),
  };
  return { bundle, keys };
}

function sender(): SenderIdentity {
  const a = generateIdentity(rnd);
  return { ikPub: a.ikPub, ikDhPub: a.ikDhPub, ikDhSecret: a.ikDhSecret };
}

test('round-trip with a one-time prekey', () => {
  const bob = setupRecipient();
  const env = seal(enc('hello bob, only you can read this'), sender(), bob.bundle, rnd);
  assert.equal(dec(open(env, bob.keys)), 'hello bob, only you can read this');
});

test('round-trip when one-time prekeys are exhausted (opk=null)', () => {
  const bob = setupRecipient();
  const env = seal(enc('no opk path'), sender(), { ...bob.bundle, opk: null }, rnd);
  assert.equal(dec(open(env, bob.keys)), 'no opk path');
});

test('wire encode/decode preserves the round-trip', () => {
  const bob = setupRecipient();
  const env = seal(enc('over the wire'), sender(), bob.bundle, rnd);
  const back = envelopeFromWire(envelopeToWire(env));
  assert.equal(dec(open(back, bob.keys)), 'over the wire');
});

test('tampering the header (AAD) fails to decrypt', () => {
  const bob = setupRecipient();
  const env = seal(enc('tamper me'), sender(), bob.bundle, rnd);
  const tampered = { ...env, ephemeralPub: generateX25519(rnd).pub };
  assert.throws(() => open(tampered, bob.keys));
});

test('the wrong recipient cannot open', () => {
  const bob = setupRecipient();
  const mallory = setupRecipient();
  const env = seal(enc('secret'), sender(), bob.bundle, rnd);
  assert.throws(() => open(env, mallory.keys));
});

test('an invalid signed-prekey signature is rejected at seal', () => {
  const bob = setupRecipient();
  assert.throws(() => seal(enc('x'), sender(), { ...bob.bundle, spkSig: rnd(64) }, rnd), /signed prekey/);
});

test('identityFromSeed is deterministic and recovers the same account', () => {
  const seed = rnd(64);
  const a = identityFromSeed(seed);
  const b = identityFromSeed(seed);
  // Same phrase (seed) on a new device yields the same identity keys, which is what lets the
  // server verify a restored device against the originally-registered ikPub.
  assert.deepEqual(a.ikPub, b.ikPub);
  assert.deepEqual(a.ikDhPub, b.ikDhPub);
  assert.notDeepEqual(a.ikPub, identityFromSeed(rnd(64)).ikPub);
});

test('a seed-derived identity can seal and be opened', () => {
  const bob = setupRecipient();
  const alice = identityFromSeed(rnd(64));
  const env = seal(enc('from a recovered identity'), { ikPub: alice.ikPub, ikDhPub: alice.ikDhPub, ikDhSecret: alice.ikDhSecret }, bob.bundle, rnd);
  assert.equal(dec(open(env, bob.keys)), 'from a recovered identity');
});

test('safety number is deterministic, symmetric, and key-dependent', () => {
  const a = identityFromSeed(rnd(64));
  const b = identityFromSeed(rnd(64));
  const ab = safetyNumber(a.ikPub, b.ikPub);
  // Both parties compute the same number regardless of argument order.
  assert.deepEqual(ab, safetyNumber(b.ikPub, a.ikPub));
  assert.equal(ab.length, 12);
  for (const group of ab) assert.match(group, /^\d{5}$/);
  // A different identity key yields a different number (so a key change is visible).
  const c = identityFromSeed(rnd(64));
  assert.notDeepEqual(safetyNumber(a.ikPub, c.ikPub), ab);
});
