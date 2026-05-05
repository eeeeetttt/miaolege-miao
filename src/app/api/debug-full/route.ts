import { NextResponse } from 'next/server';
import { db, pool } from '@/lib/db';

export async function GET() {
  try {
    // 检查 pool 的连接
    const conn = await pool.getConnection();
    const [dbResult] = await conn.query('SELECT DATABASE() as db');
    const [tableResult] = await conn.query('SHOW TABLES');
    conn.release();
    
    // 尝试使用 drizzle 查询
    let drizzleResult = null;
    let drizzleError = null;
    try {
      const { users } = await import('@/lib/schema');
      drizzleResult = await db.select().from(users).limit(1);
    } catch (e: any) {
      drizzleError = e.message;
    }
    
    return NextResponse.json({ 
      pool_db: dbResult,
      pool_tables: tableResult,
      drizzle_result: drizzleResult,
      drizzle_error: drizzleError
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
