import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { sql } from 'drizzle-orm';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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
    const supabase = getSupabaseClient();
    
    let totalPlanets = 0;
    let totalSignalSources = 0;
    let activeFollows = 0;
    let totalAIUsers = 0;
    let activeChallenges = 0;
    let totalTrades = 0;
    let totalProfit = 0;

    try {
      const [planetsResult] = await pool.query<any>('SELECT COUNT(*) as count FROM planets');
      totalPlanets = planetsResult[0]?.count || 0;

      const [signalsResult] = await pool.query<any>('SELECT COUNT(*) as count FROM signals');
      totalSignalSources = signalsResult[0]?.count || 0;

      const [followsResult] = await pool.query<any>("SELECT COUNT(*) as count FROM follow_records WHERE status = 'active'");
      activeFollows = followsResult[0]?.count || 0;

      // AI用户统计 - 从 Supabase 获取
      if (supabase) {
        const { count: aiCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'ai');
        totalAIUsers = aiCount || 0;
      }

      // 活跃挑战统计
      const [challengesResult] = await pool.query<any>("SELECT COUNT(*) as count FROM match_accounts WHERE status = 'active'");
      activeChallenges = challengesResult[0]?.count || 0;

      // 交易统计
      const [tradesResult] = await pool.query<any>('SELECT COUNT(*) as count, COALESCE(SUM(profit), 0) as total_profit FROM match_trade_records');
      totalTrades = tradesResult[0]?.count || 0;
      totalProfit = Number(tradesResult[0]?.total_profit) || 0;
    } catch (e) {
      console.error('Get stats from MySQL error:', e);
    }

    return NextResponse.json({
      totalUsers,
      totalCoins,
      totalPlanets,
      totalSignalSources,
      activeFollows,
      totalAIUsers,
      activeChallenges,
      totalTrades,
      totalProfit,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: '获取统计信息失败', details: String(error) }, { status: 500 });
  }
}
