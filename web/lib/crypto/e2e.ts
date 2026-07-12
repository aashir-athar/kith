// High-level client crypto for the web. Identical to the mobile e2e layer: it ties the shared
// X3DH-lite primitives to the browser keystore, so the exact same audited crypto runs everywhere.

import {
  decryptSym,
  derivePublics,
  encryptSym,
  envelopeFromWire,
  envelopeToWire,
  fromHex,
  generateX25519,
  type GroupEnvelope,
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

export interface PreKeyMaterial {
  spk: { id: string; pub: string; sig: string };
  oneTimePreKeys: { id: string; pub: string }[];
}

export interface RegistrationMaterial extends PreKeyMaterial {
  ikPub: string;
  ikDhPub: string;
}

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

export async function bootstrapIdentity(): Promise<RegistrationMaterial> {
  const mnemonic = generateMnemonic();
  await store.saveMnemonic(mnemonic);
  const id = identityFromSeed(mnemonicToSeed(mnemonic));
  await store.saveIdentity(id.ikSecret, id.ikDhSecret);
  const prekeys = await freshPreKeys(id.ikSecret);
  return { ikPub: toHex(id.ikPub), ikDhPub: toHex(id.ikDhPub), spk: prekeys.spk, oneTimePreKeys: prekeys.oneTimePreKeys };
}

export async function restoreFromPhrase(phrase: string): Promise<PreKeyMaterial> {
  if (!isValidMnemonic(phrase)) throw new Error('invalid recovery phrase');
  const id = identityFromSeed(mnemonicToSeed(phrase));
  await store.saveMnemonic(normalizeMnemonic(phrase));
  await store.saveIdentity(id.ikSecret, id.ikDhSecret);
  return freshPreKeys(id.ikSecret);
}

export async function getRecoveryPhrase(): Promise<string | null> {
  return store.loadMnemonic();
}

export async function myIdentityPubHex(): Promise<string | null> {
  const id = await store.loadIdentity();
  if (!id) return null;
  return toHex(derivePublics(id.ikSecret, id.ikDhSecret).ikPub);
}

export async function hasIdentity(): Promise<boolean> {
  return (await store.loadIdentity()) !== null;
}

export async function oneTimePreKeyCount(): Promise<number> {
  return Object.keys(await store.loadOneTimePreKeys()).length;
}

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

export async function signChallenge(challenge: string): Promise<string> {
  const identity = await store.loadIdentity();
  if (!identity) throw new Error('no identity on this device');
  return toHex(signBytes(new TextEncoder().encode(challenge), identity.ikSecret));
}

function bundleToBytes(bundle: PreKeyBundle) {
  return {
    ikPub: fromHex(bundle.ikPub),
    ikDhPub: fromHex(bundle.ikDhPub),
    spkId: bundle.spk.id,
    spkPub: fromHex(bundle.spk.pub),
    spkSig: fromHex(bundle.spk.sig),
    opk: bundle.opk ? { id: bundle.opk.id, pub: fromHex(bundle.opk.pub) } : null,
  };
}

export async function sealBytesTo(bundle: PreKeyBundle, bytes: Uint8Array): Promise<MessageEnvelope> {
  const identity = await store.loadIdentity();
  if (!identity) throw new Error('no identity on this device');
  const { ikPub, ikDhPub } = derivePublics(identity.ikSecret, identity.ikDhSecret);
  const sender: SenderIdentity = { ikPub, ikDhPub, ikDhSecret: identity.ikDhSecret };
  return envelopeToWire(seal(bytes, sender, bundleToBytes(bundle), randomBytes));
}

export async function sealTo(bundle: PreKeyBundle, plaintext: string): Promise<MessageEnvelope> {
  return sealBytesTo(bundle, new TextEncoder().encode(plaintext));
}

export async function openBytesFrom(wire: MessageEnvelope): Promise<Uint8Array> {
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
  return plaintext;
}

export async function openFrom(wire: MessageEnvelope): Promise<string> {
  return new TextDecoder().decode(await openBytesFrom(wire));
}

export async function buildGroupEnvelope(plaintext: string, members: { userId: string; bundle: PreKeyBundle }[]): Promise<GroupEnvelope> {
  const identity = await store.loadIdentity();
  if (!identity) throw new Error('no identity on this device');
  const { ikPub, ikDhPub } = derivePublics(identity.ikSecret, identity.ikDhSecret);
  const sender: SenderIdentity = { ikPub, ikDhPub, ikDhSecret: identity.ikDhSecret };
  const mk = randomBytes(32);
  const { nonce, ciphertext } = encryptSym(mk, new TextEncoder().encode(plaintext), randomBytes);
  const keys: Record<string, MessageEnvelope> = {};
  for (const m of members) {
    keys[m.userId] = envelopeToWire(seal(mk, sender, bundleToBytes(m.bundle), randomBytes));
  }
  mk.fill(0);
  return { v: 1, type: 'group', nonce: toHex(nonce), ciphertext: toHex(ciphertext), keys };
}

export async function openGroupEnvelope(env: GroupEnvelope, myUserId: string): Promise<string | null> {
  const wire = env.keys[myUserId];
  if (!wire) return null;
  const mk = await openBytesFrom(wire);
  const plaintext = decryptSym(mk, fromHex(env.nonce), fromHex(env.ciphertext));
  mk.fill(0);
  return new TextDecoder().decode(plaintext);
}
