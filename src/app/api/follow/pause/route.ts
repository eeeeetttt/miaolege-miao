import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { followRecords } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 暂停跟单
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { followId, planetId, signalId } = await request.json();

    let whereCondition;
    
    if (followId) {
      whereCondition = eq(followRecords.id, followId);
    } else if (planetId && signalId) {
      whereCondition = and(
        eq(followRecords.planetId, planetId),
        eq(followRecords.userId, session.user.id),
        eq(followRecords.signalId, signalId)
      );
    } else {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    await db
      .update(followRecords)
      .set({ status: 'paused', pausedAt: new Date() })
      .where(whereCondition as any);

    return NextResponse.json({
      success: true,
      message: '已暂停跟单',
    });
  } catch (error) {
    console.error('Pause follow error:', error);
    return NextResponse.json({ error: '暂停跟单失败' }, { status: 500 });
  }
}
