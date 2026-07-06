// Standalone migrator. Runs on a dedicated single connection (max:1), separate from the app
// pool. Invoked by `npm run db:migrate` and by the Docker entrypoint before the server starts.

import 'dotenv/config';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { env } from '../env';

const migrationClient = postgres(env.DATABASE_URL, { max: 1 });

await migrate(drizzle(migrationClient), { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname });
await migrationClient.end();

console.log('[kith-server] migrations applied');
