# Kith relay server

Zero-knowledge relay for the Kith messenger: passwordless key-based auth, prekey-bundle
distribution (X3DH-lite), and opaque ciphertext fan-out over WebSockets. The server never sees
plaintext or any secret key.

## Stack

- **Hono** on `@hono/node-server` (REST + built-in WebSocket upgrade on one port)
- **Postgres 16** via `postgres.js` + **Drizzle ORM**
- **Redis 7** via `ioredis` (pub/sub fan-out, single-use realtime tickets, presence)
- **@noble** (curves/ciphers/hashes) for Ed25519 signature verification only

## Run it (Docker)

```bash
# from server/
docker compose up            # postgres + redis + relay on :8787
curl http://localhost:8787/health
```

## Run it (local, without Docker)

```bash
# bring up just the datastores
docker compose up -d postgres redis
cp .env.example .env
npm install
npm run db:generate          # generate SQL migrations from the Drizzle schema
npm run db:migrate           # apply them
npm run dev                  # tsx watch on :8787
```

## Scripts

| script | what |
|---|---|
| `npm run dev` | watch-mode server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | node:test unit tests (crypto vectors) |
| `npm run db:generate` | drizzle-kit generate migrations |
| `npm run db:migrate` | apply migrations |

Shared wire types live in `../shared` (`@kith/shared`) and are imported by both the server and
the Expo app.
