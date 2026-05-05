import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';

export async function GET() {
  try {
    // 检查 drizzle 能查询到哪些表
    const result = await db.select().from(users).limit(1);
    return NextResponse.json({ 
      success: true, 
      drizzle_users: result,
      columns: Object.keys(result[0] || {})
    });
  } catch (error: unknown) {
    console.error('drizzle 错误:', error);
    const err = error as any;
    return NextResponse.json({ 
      success: false, 
      error: err.message || '失败',
      code: err.code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage
    });
  }
}
