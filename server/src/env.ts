// Validated environment. Defaults target the local docker-compose stack so `npm run dev` works
// without a .env file; override for production.

import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().default(8787),
  DATABASE_URL: z.string().default('postgres://kith:kith@localhost:5432/kith'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SESSION_SECRET: z.string().default('dev-only-change-me'),
  SESSION_TTL_SECONDS: z.coerce.number().default(60 * 60 * 24 * 30),
  TICKET_TTL_SECONDS: z.coerce.number().default(30),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = EnvSchema.parse(process.env);
export type Env = z.infer<typeof EnvSchema>;
