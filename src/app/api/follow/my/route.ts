import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { followRecords, planets, signals } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

/**
 * 获取当前用户的跟单信息
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 查询用户的所有跟单记录（包括活跃和暂停的）
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
      .where(eq(followRecords.userId, session.user.id));

    // 获取信号源账户信息
    const result = await Promise.all(
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

    return NextResponse.json({ follows: result });
  } catch (error) {
    console.error('Get follow info error:', error);
    return NextResponse.json({ error: '获取跟单信息失败' }, { status: 500 });
  }
}
