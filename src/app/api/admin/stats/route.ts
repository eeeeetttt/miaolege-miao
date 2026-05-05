import { NextResponse } from 'next/server';
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

    // 使用动态导入避免构建时问题
    const { getSupabaseAdmin } = await import('@/storage/database/supabase-client');
    const { db } = await import('@/lib/db');
    const { planets, signals, followRecords } = await import('@/lib/schema');
    const { sql } = await import('drizzle-orm');

    const supabase = getSupabaseAdmin();

    // 从 Supabase 获取用户数
    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userError) {
      console.error('User count error:', userError);
    }

    // 从 Supabase 获取星球币余额总和
    const { data: coinData, error: coinError } = await supabase
      .from('users')
      .select('coin_balance')
      .not('coin_balance', 'is', null);

    let totalCoins = 0;
    if (!coinError && coinData) {
      totalCoins = coinData.reduce((sum, u) => sum + (u.coin_balance || 0), 0);
    }

    // 从 MySQL 获取其他统计数据
    const [planetCount] = await db.select({ count: sql<number>`count(*)` }).from(planets);
    
    // 信号源总数
    const [signalSourceCount] = await db
      .select({ count: sql<number>`count(distinct sender_account)` })
      .from(signals);
    
    const [followCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(followRecords)
      .where(sql`status = 'active'`);

    // 从环境变量或默认值获取配置
    const config = {
      planetCreationThreshold: parseInt(process.env.PLANET_CREATION_THRESHOLD || '2000'),
      rechargeEnabled: process.env.RECHARGE_ENABLED !== 'false',
      defaultTicketPrice: parseInt(process.env.DEFAULT_TICKET_PRICE || '100'),
      maxPublishers: parseInt(process.env.MAX_PUBLISHERS || '3'),
    };

    return NextResponse.json({
      stats: {
        totalUsers: userCount || 0,
        totalPlanets: planetCount?.count || 0,
        totalSignalSources: signalSourceCount?.count || 0,
        activeFollows: followCount?.count || 0,
        totalCoins,
      },
      config,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json({ error: '获取统计数据失败', details: String(error) }, { status: 500 });
  }
}
