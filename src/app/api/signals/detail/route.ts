import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { signals, mtAccounts, followRecords, planetMembers } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';

// 获取单个信号源的详细数据
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('account');
    const planetId = searchParams.get('planetId');

    if (!accountNumber) {
      return NextResponse.json({ error: '缺少账号参数' }, { status: 400 });
    }

    // 获取MT账号信息
    const [mtAccount] = await db
      .select()
      .from(mtAccounts)
      .where(eq(mtAccounts.accountNumber, accountNumber))
      .limit(1);

    // 获取该账号的所有信号，按时间升序排列（用于计算收益曲线）
    const allSignals = await db
      .select()
      .from(signals)
      .where(eq(signals.senderAccount, accountNumber))
      .orderBy(signals.createdAt);

    // 获取用户的跟单状态（如果登录且有planetId）
    let followStatus: { status: 'active' | 'paused' | 'closed'; id: number } | null = null;
    if (session?.user?.id && planetId) {
      // 获取该信号源最近的平仓信号ID
      const closeSignals = allSignals.filter(s => s.signalType?.toLowerCase().includes('close'));
      if (closeSignals.length > 0) {
        const latestCloseSignal = closeSignals[closeSignals.length - 1];
        const [follow] = await db
          .select()
          .from(followRecords)
          .where(and(
            eq(followRecords.userId, session.user.id),
            eq(followRecords.planetId, parseInt(planetId as string)),
            eq(followRecords.signalId, latestCloseSignal.id)
          ))
          .limit(1);
        
        if (follow && follow.status) {
          followStatus = { status: follow.status, id: follow.id };
        }
      }
    }

    // 计算详细统计
    const stats = calculateDetailedStats(allSignals, mtAccount);

    return NextResponse.json({
      account: mtAccount || { accountNumber, broker: stats.broker || '未知经纪商' },
      signals: allSignals.reverse(), // 返回时按时间倒序
      stats,
      followStatus,
    });
  } catch (error) {
    console.error('Get signal detail error:', error);
    return NextResponse.json({ error: '获取信号详情失败' }, { status: 500 });
  }
}

function calculateDetailedStats(accountSignals: any[], mtAccount: any) {
  // 筛选平仓信号（close类型）
  const closeSignals = accountSignals.filter(s => 
    s.signalType?.toLowerCase().includes('close')
  );
  
  const totalTrades = closeSignals.length;
  
  let totalProfit = 0;
  let winCount = 0;
  let lossCount = 0;
  let maxProfit = 0;
  let maxLoss = 0;
  let totalWinProfit = 0;
  let totalLossProfit = 0;
  
  // 获取经纪商（优先从信号中获取，否则从MT账号获取）
  const broker = accountSignals.find(s => s.broker)?.broker || mtAccount?.broker || '未知经纪商';
  
  // 获取初始余额（第一条有余额记录的信号）
  const firstSignalWithBalance = accountSignals.find(s => s.balance);
  let initialBalance = 10000; // 默认初始资金
  if (firstSignalWithBalance && firstSignalWithBalance.balance) {
    // 计算初始余额：当前余额减去累计盈亏
    let cumulativeProfit = 0;
    for (const signal of accountSignals) {
      if (signal.signalType?.toLowerCase().includes('close') && signal.dealProfit) {
        cumulativeProfit += parseFloat(signal.dealProfit);
      }
    }
    initialBalance = parseFloat(firstSignalWithBalance.balance) - cumulativeProfit;
    if (initialBalance <= 0) initialBalance = 10000;
  }

  const profitHistory: { date: string; time: string; profit: number; returnRate: string }[] = [];
  const tradeHistory: any[] = [];
  
  let cumulativeProfit = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;

  for (const signal of closeSignals) {
    const profit = parseFloat(signal.dealProfit || '0');
    totalProfit += profit;

    if (profit > 0) {
      winCount++;
      totalWinProfit += profit;
      if (profit > maxProfit) maxProfit = profit;
    } else if (profit < 0) {
      lossCount++;
      totalLossProfit += Math.abs(profit);
      if (profit < maxLoss) maxLoss = profit;
    }

    // 累计收益
    cumulativeProfit += profit;
    
    // 计算当前余额和收益率
    const currentBalance = initialBalance + cumulativeProfit;
    const returnRate = ((cumulativeProfit / initialBalance) * 100).toFixed(2);
    
    // 收益曲线数据
    const dateObj = signal.createdAt ? new Date(signal.createdAt) : new Date();
    profitHistory.push({
      date: dateObj.toLocaleDateString(),
      time: dateObj.toLocaleTimeString(),
      profit: cumulativeProfit,
      returnRate: returnRate,
    });

    // 最大回撤计算（使用金额和百分比）
    if (cumulativeProfit > peak) peak = cumulativeProfit;
    const drawdown = peak - cumulativeProfit;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      // 计算回撤百分比：回撤金额 / 峰值时的账户余额
      const peakBalance = initialBalance + peak;
      maxDrawdownPercent = peakBalance > 0 ? (drawdown / peakBalance) * 100 : 0;
    }

    // 交易历史
    tradeHistory.push({
      ticket: signal.ticket,
      symbol: signal.symbol,
      orderType: signal.orderType,
      volume: signal.volume,
      price: signal.price,
      profit: signal.dealProfit,
      balance: signal.balance,
      createdAt: signal.createdAt,
      broker: signal.broker,
    });
  }

  // 计算胜率
  const winRate = totalTrades > 0 ? (winCount / totalTrades * 100) : 0;
  
  // 计算平均盈利和平均亏损
  const avgWin = winCount > 0 ? totalWinProfit / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLossProfit / lossCount : 0;
  
  // 盈亏比 = 平均盈利 / 平均亏损
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 999 : 0);
  
  // 总收益率
  const returnRate = ((totalProfit / initialBalance) * 100);

  return {
    totalTrades,
    winCount,
    lossCount,
    totalProfit: totalProfit.toFixed(2),
    winRate: winRate.toFixed(2),
    returnRate: returnRate.toFixed(2),
    maxDrawdown: maxDrawdown.toFixed(2),
    maxDrawdownPercent: maxDrawdownPercent.toFixed(2),
    profitFactor: profitFactor === 999 ? '∞' : profitFactor.toFixed(2),
    maxProfit: maxProfit.toFixed(2),
    maxLoss: maxLoss.toFixed(2),
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
    initialBalance: initialBalance.toFixed(2),
    broker: broker || '未知经纪商',
    profitHistory: profitHistory.slice(-60), // 最近60条
    tradeHistory,
    // 品种统计
    symbolStats: calculateSymbolStats(closeSignals),
    // 方向统计
    directionStats: calculateDirectionStats(closeSignals),
  };
}

function calculateSymbolStats(closeSignals: any[]) {
  const stats: Record<string, { count: number; profit: number; win: number; loss: number }> = {};
  
  for (const signal of closeSignals) {
    const symbol = signal.symbol || 'Unknown';
    if (!stats[symbol]) {
      stats[symbol] = { count: 0, profit: 0, win: 0, loss: 0 };
    }
    const profit = parseFloat(signal.dealProfit || '0');
    stats[symbol].count++;
    stats[symbol].profit += profit;
    if (profit > 0) stats[symbol].win++;
    else if (profit < 0) stats[symbol].loss++;
  }
  
  return stats;
}

function calculateDirectionStats(closeSignals: any[]) {
  const stats = { buy: { count: 0, profit: 0 }, sell: { count: 0, profit: 0 } };
  
  for (const signal of closeSignals) {
    const profit = parseFloat(signal.dealProfit || '0');
    if (signal.orderType === 'BUY') {
      stats.buy.count++;
      stats.buy.profit += profit;
    } else if (signal.orderType === 'SELL') {
      stats.sell.count++;
      stats.sell.profit += profit;
    }
  }
  
  return stats;
}
