import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// 从环境变量获取 Supabase PostgreSQL 连接信息
function getDatabaseUrl(): string {
  const url = process.env.COZE_SUPABASE_URL;
  const key = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
  
  if (url && key) {
    // 解析 Supabase URL 获取主机
    const urlObj = new URL(url);
    const host = urlObj.host;
    const databaseUrl = `postgres://postgres:${key}@${host}:5432/postgres`;
    return databaseUrl;
  }
  
  // 回退到 DATABASE_URL
  return process.env.DATABASE_URL || '';
}

// 创建 PostgreSQL 连接池（带 SSL）
const connectionString = getDatabaseUrl();

// 始终创建连接，即使 URL 为空
const client = connectionString 
  ? postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 30,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : postgres('', { max: 0 }); // 空连接

export const db = drizzle(client, { schema });
export { client as pool };
