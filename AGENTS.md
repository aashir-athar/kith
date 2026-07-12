# Kith - agent guide

Kith is a privacy-first, default end-to-end-encrypted messenger. This repo is the full stack:
an Expo (React Native) app, a Next.js web client, a shared isomorphic crypto package, and a Hono
relay that only ever sees ciphertext. Read this before writing any code.

The single most important rule: **the relay must never be able to read a message, and the app must
never claim a capability it does not actually have.** Everything below serves those two constraints.

## Golden rules (do not break these)

1. **Zero-knowledge relay.** Plaintext and secret keys never leave the device. The server stores and
   forwards opaque envelopes plus routing metadata (who, when, size, public keys), nothing more.
2. **One crypto implementation.** All sealing/opening lives in `shared/` (`@kith/shared`) and runs
   byte-for-byte identically on the phone, the browser, and the server tests. Do not fork it per platform.
3. **Randomness is injected, never assumed.** The client passes `expo-crypto`, the web passes
   WebCrypto, the server and tests pass the Node CSPRNG. No `get-random-values` polyfill.
4. **Secrets in secure storage only.** Identity and session keys live in `expo-secure-store` (mobile).
   Only ciphertext may live in AsyncStorage (mobile) or localStorage (web). The web keystore is an
   honest XSS trade-off and is documented as such in the UI.
5. **Ship behavior, not theatre.** Every control on screen is wired to the real encrypted transport.
   A feature that is not built is absent in a live build (relay configured), not faked. No dead
   controls, no hardcoded trust signals; derive state from reality and make the unsafe state loud.
6. **Latest stable, never pinned back.** Use the newest stable versions that actually build together.
   The Expo app follows the versions Expo SDK 57 pins and tests; the standalone web client tracks the
   newest stable Next / React / TypeScript that pass `typecheck` and `build`.
7. **No em-dashes, no emojis** in any tracked file (code, copy, commits, configs). Use hyphens and
   real words. Icons come from `lucide-react-native` (mobile) or inline SVG (web), never emoji.
8. **No AI attribution** in commits or PRs. Never add "Co-Authored-By: Claude" or "Generated with".

## Repository layout

```text
kith/
  src/app/            Expo Router routes (src/app structure, native tabs from expo-router)
  src/crypto/         keystore (secure-store), e2e (seal/open), mnemonic, random
  src/stores/         Zustand: session + chat, persisted as ciphertext
  src/api/            REST client, reconnecting socket, TanStack Query client
  src/net/            transport config, messaging singleton, secure storage
  shared/             @kith/shared: X3DH-lite crypto + Zod DTOs + wire types (self-contained, TS source)
  server/             Hono relay: routes, ws gateway, Drizzle schema + migrations, node:test suite
  web/                Next.js web client (App Router). Reuses @kith/shared crypto verbatim.
```

The three app surfaces (mobile, web, server tests) all import `@kith/shared`. When you touch crypto or
DTOs, you are touching all three at once. `web/` is excluded from the RN `tsconfig`, Metro blockList,
and `server/` is kept out of both; do not undo those isolations.

## Commands

```bash
# Mobile app (Expo SDK 57)
npm install
npx tsc --noEmit                 # strict typecheck (no typecheck script; run tsc directly)
npx expo start                   # needs EXPO_PUBLIC_API_URL to hit the relay; unset = offline demo

# Shared crypto package
cd shared && npm install

# Relay
cd server && docker compose up --build      # Postgres 16 + Redis 7 + relay
cd server && npm test                        # crypto vectors + PGlite integration tests
cd server && npm run typecheck

# Web client (Next.js, standalone)
cd web && npm install
cd web && npm run typecheck      # tsc --noEmit, this is the real type gate
cd web && npm run build          # Next production build
cd web && npm run dev
```

Note on the web toolchain: Next 16's in-build type worker crashes on the TS 7 native compiler, so
`web/next.config.mjs` sets `typescript.ignoreBuildErrors`. Types are still enforced by
`npm run typecheck`. Remove that flag once Next ships TS 7 support.

## How a message flows (so you do not break it)

1. Sender fetches the recipient's signed prekey bundle from the relay.
2. `@kith/shared` runs X3DH-lite: X25519 Diffie-Hellman ops, HKDF-SHA256 to a session key, then
   XChaCha20-Poly1305 seals the content with the routing header bound as authenticated data.
3. For a group, the content is encrypted once with a fresh message key; that key is sealed to each
   member individually (`GroupEnvelope`). A community is a directory of encrypted group channels.
4. The relay persists and fans out the opaque envelope. The recipient reconstructs the session key
   from stored secrets, opens the ciphertext, and burns the one-time prekey.

Identity is a BIP39 seed phrase. The Ed25519 and X25519 identity keys derive from it deterministically,
so the same phrase restores the account on any device with no server-side secret. Login proves control
of the identity key by signing a server challenge; there is no password.

## Honesty ledger (shipped vs planned)

Shipped and wired to the real transport: 1:1 and group messaging, communities/channels, media
(images/voice/docs/stickers/location/contacts/polls as sealed blob refs), reactions, pins, forward,
edit, delete-for-everyone, disappearing messages, delivery/read receipts, typing, presence,
content-free push that survives force-quit, server-enforced block/mute, safety-number verification,
history hydration + gap-detectable sync, encrypted local persistence, passwordless auth, seed-phrase
recovery, QR add, real account deletion.

On the roadmap (must stay absent in live builds until built): Double Ratchet forward secrecy,
voice/video calls, multi-device sync. The app never claims forward secrecy it does not have.

## Conventions

- TypeScript strict everywhere, including `noUncheckedIndexedAccess`. Keep both typechecks green.
- Design follows the installed 2026 design-engineering law and taste skills; the web client mirrors
  the mobile design language (Kith coral, Geist type, calm layout).
- Copy follows the copywriting skills: second person, concrete, zero hype, scrubbed of AI tells.
- Git: one branch per change (kebab-case, dated when useful); push there and surface the compare URL.
  Commits to any aashir-athar repo must override author and committer to
  `aashir-athar@users.noreply.github.com` (account-wide GH007 protection), via env and `--author`,
  never global config.
