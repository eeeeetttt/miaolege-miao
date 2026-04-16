import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, planets, signals, followRecords } from '@/lib/schema';
import { sql, countDistinct } from 'drizzle-orm';
import { isAdmin } from '@/lib/admin';

/**
 * 获取后台统计数据
 */
export async function GET() {
  try {
    // 验证管理员权限
    const { isAdmin: admin } = await isAdmin();
    
    if (!admin) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    // 获取统计数据
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [planetCount] = await db.select({ count: sql<number>`count(*)` }).from(planets);
    
    // 信号源总数：统计有多少不同的sender_account发布过信号
    const [signalSourceCount] = await db
      .select({ count: sql<number>`count(distinct sender_account)` })
      .from(signals);
    
    const [followCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(followRecords)
      .where(sql`status = 'active'`);
    
    const [coinSum] = await db
      .select({ total: sql<number>`coalesce(sum(coin_balance), 0)` })
      .from(users);

    // 从环境变量或默认值获取配置
    const config = {
      planetCreationThreshold: parseInt(process.env.PLANET_CREATION_THRESHOLD || '2000'),
      rechargeEnabled: process.env.RECHARGE_ENABLED !== 'false',
      defaultTicketPrice: parseInt(process.env.DEFAULT_TICKET_PRICE || '100'),
      maxPublishers: parseInt(process.env.MAX_PUBLISHERS || '3'),
    };

    return NextResponse.json({
      stats: {
        totalUsers: userCount.count,
        totalPlanets: planetCount.count,
        totalSignalSources: signalSourceCount.count, // 信号源总数
        activeFollows: followCount.count,
        totalCoins: coinSum.total,
      },
      config,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
