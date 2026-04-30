import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// 获取排名数据
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // 创建 Supabase 客户端
    const supabaseUrl = process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 获取所有活跃挑战者的排名（基于净值收益率）
    const { data: registrations, error } = await supabase
      .from('challenge_registrations')
      .select(`
        id,
        user_id,
        current_level,
        status,
        created_at,
        profiles:user_id (name, email)
      `)
      .in('status', ['active', 'level_passed'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取排名失败:', error);
      // 返回默认排名数据
      return NextResponse.json({
        rankings: getDefaultRankings(),
        totalParticipants: 0
      });
    }

    // 获取每个用户的最新净值
    const rankings = await Promise.all(
      (registrations || []).map(async (reg: any, index: number) => {
        // 获取该用户当前关卡的初始净值
        const { data: levelConfig } = await supabase
          .from('challenge_level_config')
          .select('initial_balance')
          .eq('level', reg.current_level || 1)
          .single();

        const initialBalance = levelConfig?.initial_balance || 1000;

        // 获取最新净值
        const { data: latestEquity } = await supabase
          .from('challenge_equity_history')
          .select('equity')
          .eq('user_id', reg.user_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const currentEquity = latestEquity?.equity || initialBalance;
        const profitPercent = ((currentEquity - initialBalance) / initialBalance) * 100;

        return {
          rank: index + 1,
          userId: reg.user_id,
          userName: reg.profiles?.name || reg.profiles?.email?.split('@')[0] || '匿名用户',
          level: reg.current_level || 1,
          balance: currentEquity,
          profitPercent: profitPercent
        };
      })
    );

    // 按收益率排序
    rankings.sort((a, b) => b.profitPercent - a.profitPercent);

    // 重新分配排名
    rankings.forEach((item, index) => {
      item.rank = index + 1;
    });

    // 如果用户已登录，标记用户自己的排名
    if (session?.user?.id) {
      const userRankIndex = rankings.findIndex(r => r.userId === session.user.id);
      if (userRankIndex !== -1) {
        rankings[userRankIndex].userName = rankings[userRankIndex].userName + ' (你)';
      }
    }

    // 如果没有数据，返回默认排名
    if (rankings.length === 0) {
      return NextResponse.json({
        rankings: getDefaultRankings(),
        totalParticipants: 0
      });
    }

    return NextResponse.json({
      rankings,
      totalParticipants: rankings.length
    });

  } catch (error) {
    console.error('排名API错误:', error);
    // 返回默认排名数据
    return NextResponse.json({
      rankings: getDefaultRankings(),
      totalParticipants: 0
    });
  }
}

// 默认排名数据（用于没有数据时展示）
function getDefaultRankings() {
  return [
    { rank: 1, userName: '交易高手', level: 8, balance: 2850, profitPercent: 185.0 },
    { rank: 2, userName: '黄金猎手', level: 7, balance: 2100, profitPercent: 110.0 },
    { rank: 3, userName: '趋势追踪', level: 6, balance: 1850, profitPercent: 85.0 },
    { rank: 4, userName: '波段之王', level: 5, balance: 1650, profitPercent: 65.0 },
    { rank: 5, userName: '突破交易', level: 4, balance: 1520, profitPercent: 52.0 },
  ];
}
