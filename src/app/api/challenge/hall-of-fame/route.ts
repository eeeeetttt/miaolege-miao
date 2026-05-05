import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { challengeHallOfFame, users } from '@/lib/schema';
import { eq, desc, count, sql } from 'drizzle-orm';

// 获取名人堂列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 获取总数
    const [totalResult] = await db.select({ count: count() }).from(challengeHallOfFame);
    const total = totalResult?.count || 0;

    // 获取名人堂列表
    const hallOfFame = await db.query.challengeHallOfFame.findMany({
      orderBy: [desc(challengeHallOfFame.completedAt)],
      limit,
      offset,
    });

    // 获取用户信息
    const userIds = hallOfFame.map(h => h.userId);
    const userInfos = await db.query.users.findMany({
      where: sql`${users.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`,
    });

    const userMap = new Map(userInfos.map(u => [u.userId, u]));

    // 合并数据
    const result = hallOfFame.map((record, index) => {
      const user = userMap.get(record.userId);
      return {
        rank: offset + index + 1,
        id: record.id,
        userId: record.userId,
        displayName: record.isAnonymous ? '匿名用户' : (record.displayName || user?.name || '匿名用户'),
        avatar: record.isAnonymous ? null : (user?.avatarUrl || null),
        completedAt: record.completedAt,
        totalDuration: record.totalDuration,
        formattedDuration: formatDuration(record.totalDuration || 0),
        rewardClaimed: record.rewardClaimed,
      };
    });

    return NextResponse.json({
      list: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get hall of fame error:', error);
    return NextResponse.json({ 
      error: '获取名人堂失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 格式化时长
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  }
  return `${secs}秒`;
}
