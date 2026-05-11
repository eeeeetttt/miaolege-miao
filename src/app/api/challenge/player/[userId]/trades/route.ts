import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const matchType = searchParams.get('matchType') || 'kline';

    const [trades] = await pool.query(
      `SELECT * FROM match_trades WHERE user_id = ? AND match_type = ? ORDER BY created_at DESC LIMIT 100`,
      [userId, matchType]
    ) as [any[], any];

    return NextResponse.json({ trades });
  } catch (error: any) {
    console.error('获取交易记录失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
