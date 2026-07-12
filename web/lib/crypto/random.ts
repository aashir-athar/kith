// Browser CSPRNG, injected into the shared crypto exactly like expo-crypto is on the phone, so the
// @noble primitives run byte-for-byte the same across web, mobile, and the server tests.

export function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}
