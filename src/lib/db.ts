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

// 连接配置优化：减少超时时间，避免页面加载变慢
const client = connectionString 
  ? postgres(connectionString, {
      max: 5,
      idle_timeout: 10,
      connect_timeout: 5, // 5秒超时，避免长时间等待
      ssl: {
        rejectUnauthorized: false,
      },
      // 懒连接：不在模块加载时立即连接
      lazy_connect: true,
    })
  : postgres('', { max: 0 });

export const db = drizzle(client, { schema });
export { client as pool };
