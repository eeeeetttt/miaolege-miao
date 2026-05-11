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
      'SELECT * FROM match_equity_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
      [userId]
    ) as [any[], any];

    return NextResponse.json({ reports: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { netValue } = await request.json();
    const userId = session.user.id;
    
    await pool.query(
      'INSERT INTO match_equity_history (id, user_id, net_value, created_at) VALUES (UUID(), ?, ?, NOW())',
      [userId, netValue]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
