import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;
    const [rows] = await pool.query(
      `SELECT * FROM match_equity_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
      [userId]
    ) as [any[], any];

    return NextResponse.json({ history: rows });
  } catch (error: any) {
    console.error('获取净值历史失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
