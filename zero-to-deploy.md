# Zero to deploy

A complete runbook to take Kith from a fresh clone to a running app on a device, backed by a live relay. Read top to bottom the first time, then use the table of contents.

1. [Prerequisites](#1-prerequisites)
2. [Clone and install](#2-clone-and-install)
3. [Run the backend](#3-run-the-backend)
4. [Database migrations](#4-database-migrations)
5. [Point the app at the relay](#5-point-the-app-at-the-relay)
6. [Run the app in development](#6-run-the-app-in-development)
7. [Build with EAS](#7-build-with-eas)
8. [Deploy the relay to production](#8-deploy-the-relay-to-production)
9. [Verification checklist](#9-verification-checklist)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 20 LTS or newer | Runs the app tooling, the relay, and the tests. |
| npm | 10+ | Ships with Node 20. |
| Docker + Docker Compose | current | Easiest way to run Postgres, Redis, and the relay locally. |
| Expo account and EAS CLI | current | Only needed for device builds. Install with `npm i -g eas-cli`. |
| Android Studio or Xcode | current | Only if you build and run a native development client locally. |

The app targets Expo SDK 57 (React Native 0.86, React 19). Do not pin dependencies back below the SDK. Install packages with `npx expo install`, never by hand-editing `package.json`.

---

## 2. Clone and install

```bash
git clone https://github.com/aashir-athar/kith.git
cd kith

# App dependencies
npm install

# The shared crypto package carries @noble and zod as regular dependencies so it resolves
# identically on the client, in the server, and inside Docker. Install them once.
cd shared && npm install && cd ..

# Server dependencies
cd server && npm install && cd ..
```

The repository is a small monorepo:

```
kith/        the Expo app
kith/shared/ @kith/shared, the isomorphic X3DH-lite crypto and Zod contracts
kith/server/ the Hono relay, Drizzle schema, and migrations
```

---

## 3. Run the backend

### Option A: Docker Compose (recommended)

One command brings up Postgres 16, Redis 7, and the relay. The build context is the repo root so the image can copy the sibling `shared` package.

```bash
cd server
docker compose up --build
```

The relay listens on `http://localhost:8787`. Health check:

```bash
curl http://localhost:8787/health
# {"ok":true,"service":"kith-server","ts":...}
```

Compose sets the relay environment for you (`DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `PORT`, `NODE_ENV`). The `SESSION_SECRET` in compose is `dev-only-change-me`. It is fine for local work and must be replaced in production.

### Option B: Bare metal

Run Postgres and Redis yourself, then start the relay with `tsx`.

```bash
cd server
cp .env.example .env        # edit DATABASE_URL and REDIS_URL to match your services
npm run db:migrate          # apply migrations (see next section)
npm run dev                 # tsx watch, restarts on change
```

`.env` keys:

```
PORT=8787
DATABASE_URL=postgres://kith:kith@localhost:5432/kith
REDIS_URL=redis://localhost:6379
NODE_ENV=development
SESSION_SECRET=dev-only-change-me
```

---

## 4. Database migrations

Migrations are generated from the Drizzle schema and live in `server/drizzle`.

```bash
cd server

# Apply existing migrations to the database in DATABASE_URL
npm run db:migrate

# After you change server/src/db/schema.ts, generate a new migration
npm run db:generate

# Then apply it
npm run db:migrate
```

Docker Compose runs the relay, not the migrator. If you use compose against a fresh volume, run `npm run db:migrate` once against the exposed Postgres (`postgres://kith:kith@localhost:5432/kith`) to create the tables, or add the migrate step to your own entrypoint.

---

## 5. Point the app at the relay

The app reads one variable, `EXPO_PUBLIC_API_URL`. Its presence is what turns on the real encrypted backend. Without it, the app runs a fully offline demo and the networking layer is compiled out.

Create `kith/.env` (git-ignored) from the template:

```bash
cp .env.example .env
```

Set the URL for how your app reaches the relay:

| Running the app on | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| A real device (same Wi-Fi) | `http://YOUR_LAN_IP:8787` |
| Android emulator | `http://10.0.2.2:8787` |
| iOS simulator | `http://localhost:8787` |

Find your LAN IP with `ipconfig` (Windows) or `ifconfig` / `ipconfig getifaddr en0` (macOS). In production this is your public `https://` origin, and the socket automatically upgrades to `wss://`.

---

## 6. Run the app in development

```bash
# from the repo root
npx expo start
```

Press `a` for Android or `i` for iOS.

**A note on native modules.** Kith uses config plugins (`expo-router`, `expo-splash-screen`, `expo-secure-store`, `expo-camera`) declared in `app.json`. The camera plugin adds native permission entries, so if you want the highest fidelity on a device, build a development client with EAS (next section) rather than relying on a prebuilt sandbox. Whenever you change a native config plugin in `app.json`, you must rebuild the development client for the change to take effect. JavaScript-only changes hot reload as usual.

---

## 7. Build with EAS

First-time setup:

```bash
npm i -g eas-cli
eas login
eas build:configure        # creates eas.json with build profiles
```

Add the relay URL to the build profile so the binary talks to production. In `eas.json`, set it under the profile you build:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_API_URL": "https://relay.your-domain.com" }
    },
    "production": {
      "env": { "EXPO_PUBLIC_API_URL": "https://relay.your-domain.com" }
    }
  }
}
```

Build:

```bash
# Internal preview APK for Android
eas build -p android --profile preview

# Store builds
eas build -p android --profile production
eas build -p ios --profile production
```

The app version and slug come from `app.json` (`name: kith`, `slug: kith`, `version: 1.0.0`). Bump the version before a store submission.

---

## 8. Deploy the relay to production

The relay is a standard Node service with two dependencies: Postgres and Redis.

1. **Provision** a Postgres database and a Redis instance. Managed offerings are fine.
2. **Set environment** on your host or container platform:

   ```
   PORT=8787
   DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/kith
   REDIS_URL=rediss://HOST:6379
   SESSION_SECRET=<a long random secret, rotated>
   NODE_ENV=production
   ```

   Generate the secret with `openssl rand -hex 32`. It signs the opaque session ids stored in Redis. Rotate it on a schedule.
3. **Build the image** from the repo root (the Dockerfile copies the sibling `shared` package):

   ```bash
   docker build -f server/Dockerfile -t kith-relay .
   ```
4. **Run migrations** against the production database once per schema change:

   ```bash
   cd server && DATABASE_URL="postgres://..." npm run db:migrate
   ```
5. **Run the container** and put it behind TLS. The client speaks HTTPS and upgrades the socket to WSS, so terminate TLS at your load balancer or reverse proxy and forward both `/` and the `/ws` upgrade to the container.
6. **Point the app** at the public origin by setting `EXPO_PUBLIC_API_URL` in the EAS build profile (section 7).

Operational notes:

- The relay is zero knowledge. Backups of Postgres contain ciphertext and public key material only, never plaintext or secret keys.
- Redis holds short-lived realtime tickets and per-user fan-out channels. It can be flushed without data loss; clients reconnect and re-fetch.
- Scale the relay horizontally behind the load balancer. Fan-out rides Redis pub/sub, so multiple relay instances share delivery.

---

## 9. Verification checklist

Run these before calling a deployment done.

```bash
# App type safety (strict)
npm run typecheck

# Server type safety and tests (crypto vectors + PGlite integration)
cd server && npm run typecheck && npm test
```

Then, on two devices or a device plus an emulator:

- [ ] Register on device A, back up the recovery phrase, reach the chat list.
- [ ] Register on device B, start a chat with A by username, exchange text both ways.
- [ ] Edit and delete a message on A, confirm it updates on B.
- [ ] Confirm receipts move to delivered and read, and typing shows.
- [ ] Force-quit both apps, relaunch, confirm history is restored from the encrypted local store.
- [ ] On device B, delete the app data, reinstall, restore from the recovery phrase, confirm new messages from A arrive.
- [ ] Delete the account on A, confirm sign-out and that the relay row is gone.

---

## 10. Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| App shows the offline demo, not real chats | `EXPO_PUBLIC_API_URL` is not set or not readable. Recreate `.env`, restart `npx expo start` with the cache cleared (`--clear`). |
| Cannot reach the relay from a real device | You used `localhost`. Use your machine's LAN IP and make sure the device is on the same network and the firewall allows port 8787. |
| Relay logs "Can't find meta/_journal.json" | Migrations were not applied. Run `npm run db:migrate` in `server`. |
| `@kith/shared` fails to resolve | The shared package was not installed. Run `cd shared && npm install`. It carries its own dependencies on purpose. |
| Android emulator cannot reach the relay | Use `http://10.0.2.2:8787`, which maps to the host loopback. |
| Camera permission or native change not taking effect | Native config plugin changes require a rebuilt development client. Rebuild with EAS. |
| WebSocket connects then drops | Your proxy is not forwarding the `/ws` upgrade or WSS. Forward the upgrade header and terminate TLS correctly. |

---

Questions or improvements? Open an issue or a pull request at [github.com/aashir-athar/kith](https://github.com/aashir-athar/kith).
