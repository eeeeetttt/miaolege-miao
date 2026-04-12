import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// 获取玩家的挑战详情
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await params;
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取用户的挑战注册记录（已完成或进行中的）
    const { data: registrations, error: regError } = await supabase
      .from('challenge_registrations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (regError || !registrations || registrations.length === 0) {
      return NextResponse.json({ error: '未找到该玩家的挑战记录' }, { status: 404 });
    }

    const registration = registrations[0];
    const tradingAccount = registration.trading_account;

    // 获取关卡配置
    const { data: levelConfigs } = await supabase
      .from('challenge_level_config')
      .select('level, name, description, initial_balance, target_balance, fail_balance, reward')
      .eq('is_active', true)
      .order('level');

    // 获取历史净值数据
    let equityHistory: Array<{
      recorded_at: string;
      equity: number;
      balance: number;
      profit: number;
    }> = [];

    if (tradingAccount) {
      const { data: historyData } = await supabase
        .from('mt_account_equity')
        .select('recorded_at, equity, balance, profit')
        .eq('account_number', tradingAccount)
        .order('recorded_at', { ascending: true });

      if (historyData) {
        equityHistory = historyData.map(item => ({
          recorded_at: item.recorded_at,
          equity: parseFloat(String(item.equity)),
          balance: parseFloat(String(item.balance)),
          profit: parseFloat(String(item.profit)),
        }));
      }
    }

    // 获取 MT 账户信息（如果有）
    let mtAccountInfo = null;
    if (registration.mt_account_id) {
      const { data: accountData } = await supabase
        .from('mt_accounts')
        .select('*')
        .eq('id', registration.mt_account_id)
        .single();
      
      if (accountData) {
        mtAccountInfo = accountData;
      }
    }

    // 计算每关的统计信息
    const completedLevels: number[] = registration.completed_levels
      ? (typeof registration.completed_levels === 'string'
          ? JSON.parse(registration.completed_levels)
          : registration.completed_levels)
      : [];

    // 按关卡分组净值数据
    const levelStats = levelConfigs?.map(level => {
      const levelInitial = parseFloat(String(level.initial_balance)) || 1000;
      const levelTarget = parseFloat(String(level.target_balance)) || 2000;
      const levelFail = parseFloat(String(level.fail_balance)) || 100;

      // 找到该关卡的净值记录
      const levelHistory = equityHistory.filter((_, index) => {
        // 简化处理：平均分配历史记录到各关卡
        if (completedLevels.includes(level.level)) {
          // 已完成的关卡，取前N条记录
          return index < Math.ceil(equityHistory.length / (levelConfigs?.length || 1));
        }
        return false;
      });

      // 计算该关卡的统计数据
      const entryEquity = levelHistory.length > 0 ? levelHistory[0].equity : levelInitial;
      const exitEquity = levelHistory.length > 0 ? levelHistory[levelHistory.length - 1].equity : levelInitial;
      const maxEquity = levelHistory.length > 0 ? Math.max(...levelHistory.map(h => h.equity)) : levelInitial;
      const minEquity = levelHistory.length > 0 ? Math.min(...levelHistory.map(h => h.equity)) : levelInitial;
      const profit = exitEquity - entryEquity;

      return {
        level: level.level,
        name: level.name,
        description: level.description,
        initialBalance: levelInitial,
        targetBalance: levelTarget,
        failBalance: levelFail,
        reward: level.reward,
        isCompleted: completedLevels.includes(level.level),
        isCurrent: registration.current_level === level.level && registration.status === 'active',
        entryEquity,
        exitEquity,
        maxEquity,
        minEquity,
        profit,
        equityCurve: levelHistory.map(h => ({
          time: h.recorded_at,
          equity: h.equity,
          balance: h.balance,
          profit: h.profit,
        })),
      };
    }) || [];

    return NextResponse.json({
      player: {
        userId: registration.user_id,
        displayName: '挑战者', // 后续可以从用户表获取
        registrationId: registration.id,
        status: registration.status,
        currentLevel: registration.current_level,
        completedLevels,
        startedAt: registration.started_at,
        completedAt: registration.completed_at,
        totalDuration: registration.total_duration,
        serverName: registration.server_name,
        tradingAccount: registration.trading_account,
      },
      levelStats,
      equityHistory,
      mtAccountInfo,
      totalEquityHistory: equityHistory.length,
    });
  } catch (error) {
    console.error('Get player details error:', error);
    return NextResponse.json({ 
      error: '获取玩家详情失败',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
