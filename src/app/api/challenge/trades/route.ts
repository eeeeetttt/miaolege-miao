import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

// 获取订单列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level');

    const trades = await query(
      'SELECT * FROM challenge_trades WHERE user_id = ? AND level = ? ORDER BY created_at ASC',
      [session.user.id, level || 1]
    );

    return NextResponse.json({ trades: trades || [] });
  } catch (error) {
    console.error('订单API错误:', error);
    return NextResponse.json({ trades: [] });
  }
}
