import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * 获取当前用户信息
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 从 MySQL 获取用户信息
    const userData = await db.select({
      userId: users.userId,
      email: users.email,
      name: users.name,
      role: users.role,
      coinBalance: users.coinBalance,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.email, session.user.email!));

    if (!userData || userData.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = userData[0];

    return NextResponse.json({
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        coinBalance: user.coinBalance ? Number(user.coinBalance) : 0,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user info error:', error);
    return NextResponse.json({ error: '获取用户信息失败', details: String(error) }, { status: 500 });
  }
}
