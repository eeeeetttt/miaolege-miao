import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT ma.*, ua.name as user_name, ua.avatar_url 
       FROM match_accounts ma
       JOIN user_accounts ua ON ma.user_id = ua.user_id
       WHERE ma.status IN ('active', 'completed')
       ORDER BY ma.net_value DESC
       LIMIT 100`
    ) as [any[], any];
    
    return NextResponse.json({ participants: rows });
  } catch (error: any) {
    console.error('获取参赛者失败:', error);
    return NextResponse.json({ 
      participants: [],
      error: error.message 
    }, { status: 500 });
  }
}
