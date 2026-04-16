import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users, signals } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

interface ProfitPoint {
  time: string;
  equity: number;
  profit: number;
}

interface TradeRecord {
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  profit: number;
  close_time: string;
}

interface LevelEquityData {
  level: number;
  name: string;
  initialBalance: number;
  targetBalance: number;
  failBalance: number;
  equityHistory: ProfitPoint[];
}

// 获取选手详情数据
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get('id');

    if (!registrationId) {
      return NextResponse.json({ error: '缺少选手ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 获取挑战记录
    const { data: registration, error: regError } = await supabase
      .from('challenge_registrations')
      .select('*')
      .eq('id', parseInt(registrationId))
      .single();

    if (regError || !registration) {
      return NextResponse.json({ error: '未找到该挑战记录' }, { status: 404 });
    }

    const userId = registration.user_id;
    const tradingAccount = registration.trading_account;
    const currentLevel = registration.current_level || 1;
    
    // 获取用户信息
    let userName = userId.substring(0, 8);
    let userAvatar: string | null = null;
    
    try {
      const usersData = await db
        .select({ name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);

      if (usersData && usersData.length > 0) {
        userName = usersData[0].name || userName;
        userAvatar = usersData[0].avatar || null;
      }
    } catch {
      // 使用默认名称
    }

    // 获取关卡配置
    const { data: levelConfigsData } = await supabase
      .from('challenge_level_config')
      .select('level, name, initial_balance, target_balance, fail_balance')
      .eq('is_active', 1)
      .order('level');

    const levelConfigs: Record<number, { name: string; initialBalance: number; targetBalance: number; failBalance: number }> = {};
    const levelConfigsList: Array<{level: number; initialBalance: number; targetBalance: number}> = [];
    if (levelConfigsData) {
      for (const lc of levelConfigsData) {
        const config = {
          name: lc.name,
          initialBalance: parseFloat(String(lc.initial_balance)) || 1000,
          targetBalance: parseFloat(String(lc.target_balance)) || 2000,
          failBalance: parseFloat(String(lc.fail_balance)) || 100,
        };
        levelConfigs[lc.level] = config;
        levelConfigsList.push({ level: lc.level, initialBalance: config.initialBalance, targetBalance: config.targetBalance });
      }
    }

    // 获取已完成关卡
    const completedLevels: number[] = [];
    try {
      const raw = registration.completed_levels;
      if (raw) {
        if (typeof raw === 'string') {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            completedLevels.push(...parsed);
          }
        } else if (Array.isArray(raw)) {
          completedLevels.push(...raw);
        }
      }
    } catch {
      // 忽略解析错误
    }

    // 从MySQL的signals表获取平仓单子（dealProfit不为空的记录）
    const tradeHistory: TradeRecord[] = [];
    const equityHistory: ProfitPoint[] = [];
    let cumulativeProfit = 0;
    
    // 获取初始净值（当前关卡的初始值）
    const currentConfig = levelConfigs[currentLevel] || { name: `第${currentLevel}关`, initialBalance: 1000 };
    const initialBalance = currentConfig.initialBalance;
    
    try {
      // 获取所有信号，按时间正序排列
      const allSignals = await db
        .select()
        .from(signals)
        .where(eq(signals.senderAccount, tradingAccount || ''))
        .orderBy(signals.createdAt)
        .limit(500);

      for (const signal of allSignals) {
        // 只处理有平仓盈亏的单子（平仓单）
        if (signal.dealProfit !== null && signal.dealProfit !== undefined) {
          const profit = parseFloat(String(signal.dealProfit));
          cumulativeProfit += profit;
          const currentEquity = initialBalance + cumulativeProfit;
          const closeTime = signal.createdAt ? String(signal.createdAt) : '';
          
          tradeHistory.push({
            ticket: signal.ticket || 0,
            symbol: signal.symbol || '',
            type: signal.signalType === 'buy' ? '买入' : (signal.signalType === 'sell' ? '卖出' : signal.signalType || ''),
            volume: signal.volume ? parseFloat(String(signal.volume)) : 0,
            profit: profit,
            close_time: closeTime,
          });
          
          // 生成收益曲线数据点
          equityHistory.push({
            time: closeTime,
            equity: currentEquity,
            profit: cumulativeProfit,
          });
        }
      }
    } catch (tradeErr) {
      console.error('获取交易历史失败:', tradeErr);
    }

    // 构建每个关卡的收益曲线数据
    const levelEquityData: LevelEquityData[] = [];
    
    // 按关卡分组
    for (const level of completedLevels) {
      const config = levelConfigs[level] || { name: `第${level}关`, initialBalance: 1000, targetBalance: 2000, failBalance: 100 };
      levelEquityData.push({
        level,
        name: config.name,
        initialBalance: config.initialBalance,
        targetBalance: config.targetBalance,
        failBalance: config.failBalance,
        equityHistory: [], // 已完成关卡不显示详细曲线
      });
    }

    // 添加当前关卡的收益曲线
    const currentLevelConfig = levelConfigs[currentLevel] || { name: `第${currentLevel}关`, initialBalance: 1000, targetBalance: 2000, failBalance: 100 };
    levelEquityData.push({
      level: currentLevel,
      name: currentLevelConfig.name,
      initialBalance: currentLevelConfig.initialBalance,
      targetBalance: currentLevelConfig.targetBalance,
      failBalance: currentLevelConfig.failBalance,
      equityHistory: equityHistory,
    });
    
    // 反转交易历史，最新的在前面
    tradeHistory.reverse();

    return NextResponse.json({
      success: true,
      data: {
        registration: {
          id: registration.id,
          userId: registration.user_id,
          userName,
          userAvatar,
          status: registration.status,
          currentLevel,
          completedLevels,
          startedAt: registration.started_at,
          completedAt: registration.completed_at,
          failedAt: registration.failed_at,
          serverName: registration.server_name,
          tradingAccount: registration.trading_account,
        },
        levelConfigs,
        levelEquityData,
        tradeHistory,
        totalEquityRecords: equityHistory.length,
        totalTrades: tradeHistory.length,
        totalProfit: cumulativeProfit,
        currentEquity: initialBalance + cumulativeProfit,
        initialBalance,
      },
    });
  } catch (error) {
    console.error('Get participant detail error:', error);
    return NextResponse.json({ 
      error: '获取详情失败',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
