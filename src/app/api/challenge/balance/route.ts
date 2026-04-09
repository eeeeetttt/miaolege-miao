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

    // 如果有绑定的MT账户，尝试获取真实净值
    // TODO: 这里应该调用MT平台的API获取真实净值
    // 目前模拟返回账户信息
    let balance = 1000; // 默认初始净值
    let equity = 1000;
    let profit = 0;

    // 模拟：根据当前关卡和开始时间，模拟净值变化
    if (activeChallenge.started_at) {
      const startTime = new Date(activeChallenge.started_at).getTime();
      const now = Date.now();
      const hoursPassed = (now - startTime) / (1000 * 60 * 60);
      
      // 模拟每天波动 +/- 2%
      const dailyVolatility = 0.02;
      const volatility = (Math.random() - 0.5) * dailyVolatility * (hoursPassed / 24);
      const simulatedBalance = 1000 * (1 + volatility);
      balance = Math.round(simulatedBalance * 100) / 100;
      equity = balance;
      profit = balance - 1000;
    }

    return NextResponse.json({
      hasActiveChallenge: true,
      challengeId: activeChallenge.id,
      currentLevel: activeChallenge.current_level,
      completedLevels: activeChallenge.completed_levels 
        ? JSON.parse(activeChallenge.completed_levels) 
        : [],
      account: {
        serverName: activeChallenge.server_name,
        accountNumber: activeChallenge.trading_account,
      },
      balance,
      equity,
      profit,
      startedAt: activeChallenge.started_at,
      simulated: true, // 标记为模拟数据
    });
  } catch (error) {
    console.error('Get challenge balance error:', error);
    return NextResponse.json({ 
      error: '获取账户信息失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
