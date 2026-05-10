import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

// 获取净值
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ equity: null, error: '请先登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const levelParam = searchParams.get('level') || '1';

    // 尝试从challenge_user_states表获取
    const userStates = await query(
      'SELECT equity, positions, level FROM challenge_user_states WHERE user_id = ? ORDER BY level DESC LIMIT 1',
      [session.user.id]
    );

    if (userStates && userStates.length > 0) {
      return NextResponse.json({
        equity: userStates[0].equity,
        positions: userStates[0].positions ? JSON.parse(userStates[0].positions) : [],
        level: userStates[0].level
      });
    }

    // 如果表没有数据，返回null让前端使用本地状态
    return NextResponse.json({
      equity: null,
      positions: [],
      level: 1,
      hasData: false
    });
  } catch (error) {
    console.error('净值API错误:', error);
    return NextResponse.json({
      equity: null,
      positions: [],
      level: 1,
      hasData: false
    });
  }
}
