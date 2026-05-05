import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { sql } from 'drizzle-orm';

/**
 * 获取系统统计信息
 */
export async function GET(request: NextRequest) {
  try {
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    if (session.user.email !== '497209390@qq.com') {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    // 从 MySQL 获取用户统计
    const userStats = await db.select({
      totalUsers: sql<number>`count(*)`,
      totalCoins: sql<number>`COALESCE(SUM(coin_balance), 0)`,
    }).from(users);
    
    const totalUsers = Number(userStats[0]?.totalUsers) || 0;
    const totalCoins = Number(userStats[0]?.totalCoins) || 0;

    // 获取其他统计数据
    const { pool } = await import('@/lib/db');
    
    let totalPlanets = 0;
    let totalSignalSources = 0;
    let activeFollows = 0;

    try {
      const [planetsResult] = await pool.query<any>('SELECT COUNT(*) as count FROM planets');
      totalPlanets = planetsResult[0]?.count || 0;

      const [signalsResult] = await pool.query<any>('SELECT COUNT(*) as count FROM signals');
      totalSignalSources = signalsResult[0]?.count || 0;

      const [followsResult] = await pool.query<any>("SELECT COUNT(*) as count FROM follow_records WHERE status = 'active'");
      activeFollows = followsResult[0]?.count || 0;
    } catch (e) {
      console.error('Get stats from MySQL error:', e);
    }

    return NextResponse.json({
      totalUsers,
      totalCoins,
      totalPlanets,
      totalSignalSources,
      activeFollows,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: '获取统计信息失败', details: String(error) }, { status: 500 });
  }
}
