import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, signals, mtAccounts } from '@/lib/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// 更新用户头像
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { avatar } = await request.json();

    if (!avatar) {
      return NextResponse.json({ error: '头像地址不能为空' }, { status: 400 });
    }

    await db
      .update(users)
      .set({ avatar, updatedAt: new Date() })
      .where(eq(users.userId, session.user.id));

    return NextResponse.json({ success: true, avatar });
  } catch (error) {
    console.error('Update avatar error:', error);
    return NextResponse.json({ error: '更新头像失败' }, { status: 500 });
  }
}
