// BIP39 recovery phrase. The 12-word phrase is the human-holdable form of the account's identity
// seed: entropy comes from the injected CSPRNG (expo-crypto), keeping the "randomness is injected"
// invariant so no get-random-values polyfill is needed. Seed -> identity is done in @kith/shared.

import { entropyToMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { randomBytes } from './random';

/** Lower-case, collapse runs of whitespace: what the user typed vs. the canonical phrase. */
export function normalizeMnemonic(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** 128 bits of entropy -> a 12-word phrase. */
export function generateMnemonic(): string {
  return entropyToMnemonic(randomBytes(16), wordlist);
}

export function isValidMnemonic(phrase: string): boolean {
  return validateMnemonic(normalizeMnemonic(phrase), wordlist);
}

/** BIP39 seed (64 bytes) used to derive the identity keys. Deterministic, no randomness. */
export function mnemonicToSeed(phrase: string): Uint8Array {
  return mnemonicToSeedSync(normalizeMnemonic(phrase));
}
