// High-level client crypto. Ties the shared X3DH-lite primitives to on-device key storage:
// generate + persist an identity and prekeys, sign the auth challenge, seal to a fetched bundle,
// and open inbound envelopes (burning the consumed one-time prekey). Plaintext never leaves here.

import {
  derivePublics,
  envelopeFromWire,
  envelopeToWire,
  fromHex,
  generateIdentity,
  generateX25519,
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

import { randomBytes } from './random';
import * as store from './keystore';

const OPK_COUNT = 20;

export interface RegistrationMaterial {
  ikPub: string;
  ikDhPub: string;
  spk: { id: string; pub: string; sig: string };
  oneTimePreKeys: { id: string; pub: string }[];
}

/** Generate the identity + prekeys, persist the secrets, return the public material to upload. */
export async function bootstrapIdentity(): Promise<RegistrationMaterial> {
  const id = generateIdentity(randomBytes);
  await store.saveIdentity(id.ikSecret, id.ikDhSecret);

  const spk = generateX25519(randomBytes);
  const spkId = 's0';
  const spkSig = signPreKey(spk.pub, id.ikSecret);
  await store.saveSignedPreKey(spkId, spk.secret);

  const opkSecrets: Record<string, string> = {};
  const oneTimePreKeys: { id: string; pub: string }[] = [];
  for (let i = 0; i < OPK_COUNT; i += 1) {
    const k = generateX25519(randomBytes);
    const kid = `o${i}`;
    opkSecrets[kid] = toHex(k.secret);
    oneTimePreKeys.push({ id: kid, pub: toHex(k.pub) });
  }
  await store.saveOneTimePreKeys(opkSecrets);

  return {
    ikPub: toHex(id.ikPub),
    ikDhPub: toHex(id.ikDhPub),
    spk: { id: spkId, pub: toHex(spk.pub), sig: toHex(spkSig) },
    oneTimePreKeys,
  };
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
