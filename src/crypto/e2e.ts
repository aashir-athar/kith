// High-level client crypto. Ties the shared X3DH-lite primitives to on-device key storage:
// generate + persist an identity and prekeys, sign the auth challenge, seal to a fetched bundle,
// and open inbound envelopes (burning the consumed one-time prekey). Plaintext never leaves here.

import {
  derivePublics,
  envelopeFromWire,
  envelopeToWire,
  fromHex,
  generateX25519,
  identityFromSeed,
  type MessageEnvelope,
  open,
  type PreKeyBundle,
  type RecipientKeys,
  seal,
  type SenderIdentity,
  signBytes,
  signPreKey,
  toHex,
} from '@kith/shared';

import { generateMnemonic, isValidMnemonic, mnemonicToSeed, normalizeMnemonic } from './mnemonic';
import { randomBytes } from './random';
import * as store from './keystore';

const OPK_COUNT = 20;

/** A fresh signed prekey + batch of one-time prekeys, publics only (secrets are already saved). */
export interface PreKeyMaterial {
  spk: { id: string; pub: string; sig: string };
  oneTimePreKeys: { id: string; pub: string }[];
}

export interface RegistrationMaterial extends PreKeyMaterial {
  ikPub: string;
  ikDhPub: string;
}

/** Mint a signed prekey + one-time prekeys, persist their secrets, return the publics to upload.
 * Shared by first registration and by post-restore rotation. */
async function freshPreKeys(ikSecret: Uint8Array): Promise<PreKeyMaterial> {
  const spk = generateX25519(randomBytes);
  const spkId = `s_${toHex(randomBytes(4))}`;
  const spkSig = signPreKey(spk.pub, ikSecret);
  await store.saveSignedPreKey(spkId, spk.secret);

  const opkSecrets: Record<string, string> = {};
  const oneTimePreKeys: { id: string; pub: string }[] = [];
  for (let i = 0; i < OPK_COUNT; i += 1) {
    const k = generateX25519(randomBytes);
    const kid = `o_${toHex(randomBytes(4))}`;
    opkSecrets[kid] = toHex(k.secret);
    oneTimePreKeys.push({ id: kid, pub: toHex(k.pub) });
  }
  await store.saveOneTimePreKeys(opkSecrets);
  return { spk: { id: spkId, pub: toHex(spk.pub), sig: toHex(spkSig) }, oneTimePreKeys };
}

/** Create a brand-new identity: mint a recovery phrase, derive the identity from it, persist both,
 * and return the public material to upload. The phrase is the only backup, and it never leaves the
 * device. */
export async function bootstrapIdentity(): Promise<RegistrationMaterial> {
  const mnemonic = generateMnemonic();
  await store.saveMnemonic(mnemonic);
  const id = identityFromSeed(mnemonicToSeed(mnemonic));
  await store.saveIdentity(id.ikSecret, id.ikDhSecret);
  const prekeys = await freshPreKeys(id.ikSecret);
  return { ikPub: toHex(id.ikPub), ikDhPub: toHex(id.ikDhPub), spk: prekeys.spk, oneTimePreKeys: prekeys.oneTimePreKeys };
}

/** Recover the identity from a written-down phrase on a new device, and mint fresh prekeys to
 * publish (the previous device's prekey secrets are gone). Caller logs in by key, then rotates. */
export async function restoreFromPhrase(phrase: string): Promise<PreKeyMaterial> {
  if (!isValidMnemonic(phrase)) throw new Error('invalid recovery phrase');
  const id = identityFromSeed(mnemonicToSeed(phrase));
  await store.saveMnemonic(normalizeMnemonic(phrase));
  await store.saveIdentity(id.ikSecret, id.ikDhSecret);
  return freshPreKeys(id.ikSecret);
}

/** The stored recovery phrase, so the user can re-view and back it up. */
export async function getRecoveryPhrase(): Promise<string | null> {
  return store.loadMnemonic();
}

export async function hasIdentity(): Promise<boolean> {
  return (await store.loadIdentity()) !== null;
}

export async function oneTimePreKeyCount(): Promise<number> {
  return Object.keys(await store.loadOneTimePreKeys()).length;
}

/** Generate fresh one-time prekeys, persist their secrets, and return the publics to upload. */
export async function replenishPreKeys(count: number): Promise<{ id: string; pub: string }[]> {
  const existing = await store.loadOneTimePreKeys();
  const fresh: { id: string; pub: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const k = generateX25519(randomBytes);
    const id = `o_${toHex(randomBytes(4))}`;
    existing[id] = toHex(k.secret);
    fresh.push({ id, pub: toHex(k.pub) });
  }
  await store.saveOneTimePreKeys(existing);
  return fresh;
}

/** Sign the server's auth challenge with the Ed25519 identity key. */
export async function signChallenge(challenge: string): Promise<string> {
  const identity = await store.loadIdentity();
  if (!identity) throw new Error('no identity on this device');
  return toHex(signBytes(new TextEncoder().encode(challenge), identity.ikSecret));
}

/** Seal plaintext to a recipient's fetched prekey bundle. */
export async function sealTo(bundle: PreKeyBundle, plaintext: string): Promise<MessageEnvelope> {
  const identity = await store.loadIdentity();
  if (!identity) throw new Error('no identity on this device');
  const { ikPub, ikDhPub } = derivePublics(identity.ikSecret, identity.ikDhSecret);
  const sender: SenderIdentity = { ikPub, ikDhPub, ikDhSecret: identity.ikDhSecret };
  const env = seal(
    new TextEncoder().encode(plaintext),
    sender,
    {
      ikPub: fromHex(bundle.ikPub),
      ikDhPub: fromHex(bundle.ikDhPub),
      spkId: bundle.spk.id,
      spkPub: fromHex(bundle.spk.pub),
      spkSig: fromHex(bundle.spk.sig),
      opk: bundle.opk ? { id: bundle.opk.id, pub: fromHex(bundle.opk.pub) } : null,
    },
    randomBytes,
  );
  return envelopeToWire(env);
}

/** Open an inbound envelope with our stored secrets; burn the consumed one-time prekey. */
export async function openFrom(wire: MessageEnvelope): Promise<string> {
  const identity = await store.loadIdentity();
  const spk = await store.loadSignedPreKey();
  if (!identity || !spk) throw new Error('no identity/prekey on this device');
  const opks = await store.loadOneTimePreKeys();
  const keys: RecipientKeys = {
    ikDhSecret: identity.ikDhSecret,
    spkSecret: (id) => (id === spk.id ? spk.secret : undefined),
    opkSecret: (id) => (opks[id] ? fromHex(opks[id]!) : undefined),
  };
  const plaintext = open(envelopeFromWire(wire), keys);
  if (wire.usedOpkId && opks[wire.usedOpkId]) {
    delete opks[wire.usedOpkId];
    await store.saveOneTimePreKeys(opks);
  }
  return new TextDecoder().decode(plaintext);
}
