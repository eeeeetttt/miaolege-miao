import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    // 直接使用 pool 执行查询
    const [result] = await pool.query('SELECT DATABASE() as db, user_id, email FROM users LIMIT 1');
    
    return NextResponse.json({ 
      pool_query: result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
