// BIP39 recovery phrase. Entropy comes from the injected browser CSPRNG so no polyfill is needed;
// seed -> identity is done in @kith/shared, identical to the mobile client.

import { entropyToMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import { randomBytes } from './random';

export function normalizeMnemonic(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function generateMnemonic(): string {
  return entropyToMnemonic(randomBytes(16), wordlist);
}

export function isValidMnemonic(phrase: string): boolean {
  return validateMnemonic(normalizeMnemonic(phrase), wordlist);
}

export function mnemonicToSeed(phrase: string): Uint8Array {
  return mnemonicToSeedSync(normalizeMnemonic(phrase));
}
