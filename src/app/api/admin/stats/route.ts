import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;

    let totalUsers = 0;
    let totalCoins = 0;

    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // 获取用户总数
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      totalUsers = count || 0;

      // 获取星球币总额
      const { data: coinData } = await supabase
        .from('users')
        .select('coin_balance');
      
      if (coinData) {
        totalCoins = coinData.reduce((sum, u) => sum + (u.coin_balance || 0), 0);
      }
    }

    // 从 MySQL 获取其他统计数据
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
      console.error('MySQL query error:', e);
    }

    return NextResponse.json({
      stats: {
        totalUsers,
        totalPlanets,
        totalSignalSources,
        activeFollows,
        totalCoins,
      },
      config: {
        planetCreationThreshold: 2000,
        rechargeEnabled: true,
        defaultTicketPrice: 100,
        maxPublishers: 3,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
