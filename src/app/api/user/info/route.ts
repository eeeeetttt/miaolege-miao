import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.userId, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        coinBalance: user.coinBalance,
        createdAt: user.createdAt,
        nameUpdatedAt: user.nameUpdatedAt,
        bankName: user.bankName || '',
        bankCardNumber: user.bankCardNumber || '',
        bankCardName: user.bankCardName || '',
        walletAddress: user.walletAddress || '',
      },
    });
  } catch (error) {
    console.error('Get user info error:', error);
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
  }
}
