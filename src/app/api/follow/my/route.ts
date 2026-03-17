import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { followRecords, planets, signals } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * 获取当前用户的跟单信息
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 查询用户的所有跟单记录，按创建时间倒序
    const follows = await db
      .select({
        id: followRecords.id,
        planetId: followRecords.planetId,
        planetName: planets.name,
        status: followRecords.status,
        createdAt: followRecords.createdAt,
        signalId: followRecords.signalId,
      })
      .from(followRecords)
      .innerJoin(planets, eq(followRecords.planetId, planets.id))
      .where(eq(followRecords.userId, session.user.id))
      .orderBy(desc(followRecords.createdAt));

    // 获取信号源账户信息
    const followsWithSignal = await Promise.all(
      follows.map(async (follow) => {
        // 查询信号源账户
        const signalData = await db
          .select({ senderAccount: signals.senderAccount })
          .from(signals)
          .where(eq(signals.id, follow.signalId))
          .limit(1);

        return {
          id: follow.id,
          planetId: follow.planetId,
          planetName: follow.planetName,
          signalAccount: signalData[0]?.senderAccount || '未知',
          status: follow.status,
          createdAt: follow.createdAt,
        };
      })
    );

    // 对于同一个信号源+星球的组合，只保留最新的一条记录
    const uniqueFollows = new Map<string, typeof followsWithSignal[0]>();
    for (const follow of followsWithSignal) {
      const key = `${follow.signalAccount}-${follow.planetId}`;
      if (!uniqueFollows.has(key)) {
        uniqueFollows.set(key, follow);
      }
    }

    return NextResponse.json({ follows: Array.from(uniqueFollows.values()) });
  } catch (error) {
    console.error('Get follow info error:', error);
    return NextResponse.json({ error: '获取跟单信息失败' }, { status: 500 });
  }
}
