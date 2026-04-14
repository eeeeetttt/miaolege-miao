import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 从环境变量获取 Supabase PostgreSQL 连接信息
const connectionString = process.env.DATABASE_URL;

// 创建 PostgreSQL 连接池
const client = postgres(connectionString || '', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
});

export const db = drizzle(client, { schema });
export { client as pool };
