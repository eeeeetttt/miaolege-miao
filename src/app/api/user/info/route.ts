import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const [user] = await db
      .select({
        userId: users.userId,
        email: users.email,
        name: users.name,
        coinBalance: users.coinBalance,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.userId, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user info error:', error);
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
  }
}
