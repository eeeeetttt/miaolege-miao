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
      });
    }

    let balance = 1000; // 默认初始净值
    let equity = 1000;
    let profit = 0;
    let equitySource: 'database' | 'simulated' = 'simulated';

    // 如果有交易账号，从mt_account_equity表获取真实净值
    if (activeChallenge.trading_account) {
      const { data: equityData, error: equityError } = await supabase
        .from('mt_account_equity')
        .select('equity, balance, profit')
        .eq('account_number', activeChallenge.trading_account)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (!equityError && equityData) {
        // 使用数据库中的真实净值数据
        equity = parseFloat(String(equityData.equity)) || 1000;
        balance = parseFloat(String(equityData.balance)) || equity;
        profit = parseFloat(String(equityData.profit)) || (equity - 1000);
        equitySource = 'database';
      }
    }

    // 如果数据库中没有净值数据，使用模拟值（初始净值）
    if (equitySource === 'simulated' && activeChallenge.started_at) {
      // 默认使用初始净值1000
      balance = 1000;
      equity = 1000;
      profit = 0;
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
        accountNumber: activeChallenge.trading_account,
      },
      balance,
      equity,
      profit,
      startedAt: activeChallenge.started_at,
      equitySource, // 标记数据来源：database=真实数据，simulated=模拟数据
    });
  } catch (error) {
    console.error('Get challenge balance error:', error);
    return NextResponse.json({ 
      error: '获取账户信息失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
