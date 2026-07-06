// Database client. postgres.js driver (prepared statements on by default; direct connection to
// our own Postgres, not behind a transaction pooler) + Drizzle.

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '../env';
import * as schema from './schema';

export const queryClient = postgres(env.DATABASE_URL, { max: 10 });
export const db = drizzle(queryClient, { schema, casing: 'snake_case' });

export type Db = typeof db;
export * as schema from './schema';
