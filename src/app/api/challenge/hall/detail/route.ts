import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq, inArray } from 'drizzle-orm';

interface EquityRecord {
  recorded_at: string;
  equity: number;
  balance: number;
  profit: number;
}

interface TradeRecord {
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price: number;
  profit: number;
  open_time: string;
  close_time: string;
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
      .eq('is_active', true)
      .order('level');

    const levelConfigs: Record<number, { name: string; initialBalance: number; targetBalance: number; failBalance: number }> = {};
    if (levelConfigsData) {
      for (const lc of levelConfigsData) {
        levelConfigs[lc.level] = {
          name: lc.name,
          initialBalance: parseFloat(String(lc.initial_balance)) || 1000,
          targetBalance: parseFloat(String(lc.target_balance)) || 2000,
          failBalance: parseFloat(String(lc.fail_balance)) || 100,
        };
      }
    }

    // 获取净值历史数据（用于绘制收益曲线）
    const equityHistory: EquityRecord[] = [];
    if (tradingAccount) {
      const { data: equityData } = await supabase
        .from('mt_account_equity')
        .select('recorded_at, equity, balance, profit')
        .eq('account_number', tradingAccount)
        .order('recorded_at', { ascending: true })
        .limit(500); // 最多500条数据

      if (equityData) {
        for (const record of equityData) {
          equityHistory.push({
            recorded_at: record.recorded_at,
            equity: parseFloat(String(record.equity)),
            balance: parseFloat(String(record.balance)),
            profit: parseFloat(String(record.profit)),
          });
        }
      }
    }

    // 获取已完成关卡的净值历史
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

    // 尝试获取交易历史单子（如果表存在）
    const tradeHistory: TradeRecord[] = [];
    try {
      const { data: tradesData } = await supabase
        .from('mt_account_trades')
        .select('ticket, symbol, type, volume, open_price, close_price, profit, open_time, close_time')
        .eq('account_number', tradingAccount)
        .order('close_time', { ascending: false })
        .limit(100);

      if (tradesData) {
        for (const trade of tradesData) {
          tradeHistory.push({
            ticket: trade.ticket,
            symbol: trade.symbol,
            type: trade.type,
            volume: parseFloat(String(trade.volume)),
            open_price: parseFloat(String(trade.open_price)),
            close_price: parseFloat(String(trade.close_price)),
            profit: parseFloat(String(trade.profit)),
            open_time: trade.open_time,
            close_time: trade.close_time,
          });
        }
      }
    } catch {
      // 表可能不存在，忽略错误
    }

    // 按关卡分段净值数据
    const levelEquityData: Array<{
      level: number;
      name: string;
      initialBalance: number;
      targetBalance: number;
      failBalance: number;
      equityHistory: EquityRecord[];
    }> = [];

    // 添加已完成关卡
    for (const level of completedLevels) {
      const config = levelConfigs[level] || { name: `第${level}关`, initialBalance: 1000, targetBalance: 2000, failBalance: 100 };
      levelEquityData.push({
        level,
        name: config.name,
        initialBalance: config.initialBalance,
        targetBalance: config.targetBalance,
        failBalance: config.failBalance,
        equityHistory: [], // 已完成关卡的历史数据可以通过时间筛选
      });
    }

    // 添加当前关卡
    const currentConfig = levelConfigs[currentLevel] || { name: `第${currentLevel}关`, initialBalance: 1000, targetBalance: 2000, failBalance: 100 };
    levelEquityData.push({
      level: currentLevel,
      name: currentConfig.name,
      initialBalance: currentConfig.initialBalance,
      targetBalance: currentConfig.targetBalance,
      failBalance: currentConfig.failBalance,
      equityHistory,
    });

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
