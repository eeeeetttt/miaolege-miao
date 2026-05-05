import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// 加载环境变量
try {
  const { config } = await import('dotenv');
  config();
} catch {}

// 创建连接池
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'trade',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
});

// 测试连接
pool.getConnection().then(conn => {
  console.log('MySQL连接池创建成功');
  conn.release();
}).catch(err => {
  console.error('MySQL连接池创建失败:', err);
});

export const db = drizzle(pool, { schema, mode: 'default' });
export { pool };
