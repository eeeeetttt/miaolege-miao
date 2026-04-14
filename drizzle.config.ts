import type { Config } from 'drizzle-kit';

function getDatabaseUrl(): string {
  const url = process.env.COZE_SUPABASE_URL;
  const key = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
  
  if (url && key) {
    const urlObj = new URL(url);
    const host = urlObj.host;
    return `postgres://postgres:${key}@${host}:5432/postgres`;
  }
  
  return process.env.DATABASE_URL || '';
}

export default {
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
    ssl: true,
  },
} satisfies Config;
