import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取当前挑战账户的净值
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ 
        hasActiveChallenge: false,
        balance: null,
        error: '数据库连接不可用',
      });
    }

    // 从Supabase获取用户进行中的挑战
    const { data: activeChallenge, error: getError } = await supabase
      .from('challenge_registrations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (getError || !activeChallenge) {
      return NextResponse.json({ 
        hasActiveChallenge: false,
        balance: null,
        error: '没有进行中的挑战',
      });
    }

    const tradingAccount = activeChallenge.trading_account;
    
    // 如果没有分配交易账号，返回特殊状态
    if (!tradingAccount) {
      return NextResponse.json({
        hasActiveChallenge: true,
        challengeId: activeChallenge.id,
        currentLevel: activeChallenge.current_level,
        completedLevels: activeChallenge.completed_levels 
          ? (typeof activeChallenge.completed_levels === 'string' 
              ? JSON.parse(activeChallenge.completed_levels) 
              : activeChallenge.completed_levels)
          : [],
        account: {
          serverName: activeChallenge.server_name,
          accountNumber: null,
        },
        balance: null,
        equity: null,
        profit: null,
        startedAt: activeChallenge.started_at,
        equitySource: 'no_account',
        message: '挑战已激活，等待分配交易账户',
      });
    }

    let balance: number | null = null;
    let equity: number | null = null;
    let profit: number | null = null;
    let equitySource: 'database' | 'no_data' = 'no_data';

    // 从mt_account_equity表获取真实净值
    const { data: equityData, error: equityError } = await supabase
      .from('mt_account_equity')
      .select('equity, balance, profit')
      .eq('account_number', tradingAccount)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (!equityError && equityData) {
      // 使用数据库中的真实净值数据
      equity = parseFloat(String(equityData.equity));
      balance = parseFloat(String(equityData.balance));
      profit = parseFloat(String(equityData.profit));
      
      // 如果profit为空，根据equity计算
      if (isNaN(profit) && !isNaN(equity)) {
        profit = equity - 1000; // 初始净值1000
      }
      
      equitySource = 'database';
    }

    return NextResponse.json({
      hasActiveChallenge: true,
      challengeId: activeChallenge.id,
      currentLevel: activeChallenge.current_level,
      completedLevels: activeChallenge.completed_levels 
        ? (typeof activeChallenge.completed_levels === 'string' 
            ? JSON.parse(activeChallenge.completed_levels) 
            : activeChallenge.completed_levels)
        : [],
      account: {
        serverName: activeChallenge.server_name,
        accountNumber: tradingAccount,
      },
      balance,
      equity,
      profit,
      startedAt: activeChallenge.started_at,
      equitySource, // database=真实数据，no_data=暂无数据，no_account=未分配账户
      message: equitySource === 'no_data' ? '净值数据上报中，请稍后刷新' : undefined,
    });
  } catch (error) {
    console.error('Get challenge balance error:', error);
    return NextResponse.json({ 
      error: '获取账户信息失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
