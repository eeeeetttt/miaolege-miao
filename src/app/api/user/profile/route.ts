import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
    }

    // 获取用户信息（MySQL）
    const [users] = await pool.execute(
      `SELECT user_id, email, name, role, coin_balance, gold_balance, avatar_url, active_title, created_at
       FROM user_accounts WHERE user_id = ? LIMIT 1`
    ) as [any[], any];

    if (!users || users.length === 0) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const user = users[0];

    return NextResponse.json({
      success: true,
      data: {
        id: user.user_id,
        email: user.email,
        name: user.name,
        role: user.role,
        coinBalance: user.coin_balance || 0,
        goldBalance: user.gold_balance || 0,
        avatarUrl: user.avatar_url,
        activeTitle: user.active_title,
        createdAt: user.created_at,
      }
    });
  } catch (error) {
    console.error('获取用户资料错误:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// 更新用户资料
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const { name, avatarUrl } = await request.json();

    await pool.execute(
      `UPDATE user_accounts SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE user_id = ?`,
      [name, avatarUrl, session.user.id]
    );

    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新用户资料错误:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}
