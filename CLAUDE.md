# Kith - Claude Code

Full-stack, default end-to-end-encrypted messenger: Expo (React Native) app + Next.js web client +
`@kith/shared` isomorphic crypto + Hono relay. The complete architecture, commands, crypto contract,
and honesty ledger live in AGENTS.md (imported below) and are binding.

Before you touch anything, the constraints that bite hardest here:

- **Zero-knowledge relay.** Plaintext and secret keys never leave the device. If a change could let
  the server read a message, stop.
- **One crypto source.** Seal/open lives only in `shared/`. Randomness is injected per platform
  (expo-crypto / WebCrypto / Node CSPRNG), never polyfilled.
- **Ship behavior, not theatre.** Wire every control to the real transport or leave it out of live
  builds. Never fake a capability. No forward-secrecy claims (it is on the roadmap, not shipped).
- **Latest stable, never pinned back.** Newest versions that actually build together. Verify with
  `npm run typecheck` (web + server) and `npx tsc --noEmit` (mobile) before claiming green.
- **No em-dashes, no emojis, no AI attribution** in any tracked file, commit, or PR.
- **Commits** to any aashir-athar repo override author and committer to
  `aashir-athar@users.noreply.github.com` (GH007), via env and `--author`, never global config.
- **One branch per change**, pushed, with the compare URL surfaced when done.

@AGENTS.md
