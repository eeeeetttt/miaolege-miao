import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT ma.*, ua.name as user_name, ua.email 
       FROM match_accounts ma
       JOIN user_accounts ua ON ma.user_id = ua.user_id
       WHERE ma.status = 'active' AND ma.user_id IN (SELECT user_id FROM user_accounts WHERE role = 'ai')
       ORDER BY ma.created_at DESC`
    ) as [any[], any];

    return NextResponse.json({ aiUsers: rows });
  } catch (error: any) {
    console.error('获取AI用户失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
