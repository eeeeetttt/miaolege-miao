import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM challenge_announcement WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
    ) as [any[], any];
    
    const announcement = rows.length > 0 ? rows[0] : null;
    
    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error('获取公告失败:', error);
    return NextResponse.json({ 
      announcement: null,
      error: error.message 
    }, { status: 500 });
  }
}
