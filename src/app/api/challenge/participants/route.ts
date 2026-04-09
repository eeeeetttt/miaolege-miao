import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取所有参赛者的进度和净值数据
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ 
        error: '数据库连接不可用' 
      }, { status: 503 });
    }

    // 获取所有进行中的挑战（active状态）
    const { data: activeChallenges, error: challengesError } = await supabase
      .from('challenge_registrations')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: true });

    if (challengesError) {
      console.error('Get active challenges error:', challengesError);
      return NextResponse.json({ 
        error: '获取挑战数据失败' 
      }, { status: 500 });
    }

    if (!activeChallenges || activeChallenges.length === 0) {
      return NextResponse.json({
        participants: [],
        totalCount: 0,
      });
    }

    // 收集所有交易账户
    const accountNumbers = activeChallenges
      .filter(c => c.trading_account)
      .map(c => c.trading_account as string);

    // 批量获取所有账户的净值数据
    let equityMap: Record<string, { equity: number; balance: number; profit: number; lastUpdate: string }> = {};
    
    if (accountNumbers.length > 0) {
      const { data: allEquityData, error: equityError } = await supabase
        .from('mt_account_equity')
        .select('account_number, equity, balance, profit, recorded_at')
        .in('account_number', accountNumbers);

      if (!equityError && allEquityData) {
        // 按账户分组，取最新一条记录
        for (const record of allEquityData) {
          const acc = record.account_number;
          if (!equityMap[acc] || new Date(record.recorded_at) > new Date(equityMap[acc].lastUpdate)) {
            equityMap[acc] = {
              equity: parseFloat(String(record.equity)) || 0,
              balance: parseFloat(String(record.balance)) || 0,
              profit: parseFloat(String(record.profit)) || 0,
              lastUpdate: record.recorded_at,
            };
          }
        }
      }
    }

    // 获取关卡配置
    const { data: levelConfigs, error: levelError } = await supabase
      .from('challenge_level_config')
      .select('level, name, target_balance, initial_balance')
      .eq('is_active', true)
      .order('level');

    // 构建参与者列表
    const participants = activeChallenges.map(challenge => {
      const equityData = equityMap[challenge.trading_account || ''];
      const completedLevels = challenge.completed_levels 
        ? (typeof challenge.completed_levels === 'string' 
            ? JSON.parse(challenge.completed_levels) 
            : challenge.completed_levels)
        : [];
      
      const currentEquity = equityData?.equity || null;
      const profit = equityData?.profit ?? (currentEquity !== null ? currentEquity - 1000 : null);

      // 计算当前进度
      let currentLevel = challenge.current_level || 1;
      if (currentEquity !== null) {
        // 根据净值确定当前关卡
        const levels = levelConfigs || [];
        for (const lvl of levels.reverse()) {
          if (currentEquity >= (lvl.target_balance || 0)) {
            currentLevel = lvl.level;
            break;
          }
        }
      }

      return {
        userId: challenge.user_id,
        status: challenge.status,
        startedAt: challenge.started_at,
        currentLevel,
        completedLevels,
        equity: currentEquity,
        profit,
        lastUpdate: equityData?.lastUpdate || null,
      };
    });

    // 按净值排序
    participants.sort((a, b) => {
      if (a.equity === null && b.equity === null) return 0;
      if (a.equity === null) return 1;
      if (b.equity === null) return -1;
      return b.equity - a.equity;
    });

    // 添加排名
    const rankedParticipants = participants.map((p, index) => ({
      ...p,
      rank: index + 1,
    }));

    return NextResponse.json({
      participants: rankedParticipants,
      totalCount: rankedParticipants.length,
      levelConfigs: levelConfigs?.map(l => ({
        level: l.level,
        name: l.name,
        targetBalance: l.target_balance,
        initialBalance: l.initial_balance,
      })) || [],
    });
  } catch (error) {
    console.error('Get participants error:', error);
    return NextResponse.json({ 
      error: '获取参赛者数据失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
