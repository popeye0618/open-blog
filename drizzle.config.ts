import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  // Note: actual migrations are applied with `wrangler d1 migrations apply blog [--local|--remote]`.
} satisfies Config;
