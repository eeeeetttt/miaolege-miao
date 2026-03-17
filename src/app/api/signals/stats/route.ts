import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { signals, mtAccounts, planetMembers, planets } from '@/lib/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// 获取星球信号源统计数据
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const planetId = searchParams.get('planetId');

    if (!planetId) {
      return NextResponse.json({ error: '缺少星球ID' }, { status: 400 });
    }

    // 获取星球信息
    const [planet] = await db
      .select()
      .from(planets)
      .where(eq(planets.id, parseInt(planetId)))
      .limit(1);

    if (!planet) {
      return NextResponse.json({ error: '星球不存在' }, { status: 404 });
    }

    // 获取星球的发布者（包括开启了发布者权限的星主）
    const publishers = await db
      .select({
        userId: planetMembers.userId,
        role: planetMembers.role,
      })
      .from(planetMembers)
      .where(and(
        eq(planetMembers.planetId, parseInt(planetId)),
        sql`${planetMembers.role} IN ('publisher', 'owner')`
      ));

    // 如果是星主，需要检查是否开启了发布者权限
    const signalSources: any[] = [];

    for (const publisher of publishers) {
      // 如果是星主，检查是否开启了发布者权限
      if (publisher.role === 'owner' && !planet.ownerAsPublisher) {
        continue;
      }

      // 获取用户的MT账号
      const [mtAccount] = await db
        .select()
        .from(mtAccounts)
        .where(eq(mtAccounts.userId, publisher.userId))
        .limit(1);

      if (!mtAccount) continue;

      // 计算该MT账号的统计数据
      const stats = await calculateSignalStats(mtAccount.accountNumber);
      
      signalSources.push({
        id: mtAccount.id,
        accountNumber: mtAccount.accountNumber,
        platform: mtAccount.platform,
        isVerified: mtAccount.isVerified,
        ...stats,
        broker: stats.broker || mtAccount.broker || '未知经纪商',
      });
    }

    return NextResponse.json({ signalSources });
  } catch (error) {
    console.error('Get signal sources error:', error);
    return NextResponse.json({ error: '获取信号源失败' }, { status: 500 });
  }
}

// 计算MT账号的信号统计数据
async function calculateSignalStats(accountNumber: string) {
  // 获取该账号的所有信号（按时间升序，与详情页一致）
  const accountSignals = await db
    .select()
    .from(signals)
    .where(eq(signals.senderAccount, accountNumber))
    .orderBy(signals.createdAt);

  // 获取经纪商（优先从信号中获取）
  const brokerSignal = accountSignals.find(s => s.broker);
  const broker = brokerSignal?.broker || null;

  // 只统计平仓信号
  const closeSignals = accountSignals.filter(s => 
    s.signalType?.toLowerCase().includes('close')
  );

  // 总交易笔数
  const totalTrades = closeSignals.length;

  // 获取初始余额（与详情页完全一致的计算逻辑：按时间升序，取第一条有余额的信号）
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

  // 计算盈亏
  let totalProfit = 0;
  let winCount = 0;
  let lossCount = 0;
  let totalWinProfit = 0;
  let totalLossProfit = 0;

  for (const signal of closeSignals) {
    const profit = parseFloat(signal.dealProfit || '0');
    totalProfit += profit;

    if (profit > 0) {
      winCount++;
      totalWinProfit += profit;
    } else if (profit < 0) {
      lossCount++;
      totalLossProfit += Math.abs(profit);
    }
  }

  // 胜率
  const winRate = totalTrades > 0 ? (winCount / totalTrades * 100) : 0;

  // 计算最大回撤
  let maxDrawdown = 0;
  let peak = 0;
  let cumulativeProfit = 0;
  
  for (const signal of closeSignals) { // 已经是时间正序
    const profit = parseFloat(signal.dealProfit || '0');
    cumulativeProfit += profit;
    
    if (cumulativeProfit > peak) peak = cumulativeProfit;
    const drawdown = peak - cumulativeProfit;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // 计算平均盈利和亏损
  const avgWin = winCount > 0 ? totalWinProfit / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLossProfit / lossCount : 0;

  // 盈亏比
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 999 : 0);

  // 收益率（使用动态初始资金，与详情页一致）
  const returnRate = ((totalProfit / initialBalance) * 100);

  return {
    totalProfit: totalProfit.toFixed(2),
    winRate: winRate.toFixed(2),
    totalTrades,
    returnRate: returnRate.toFixed(2),
    maxDrawdown: maxDrawdown.toFixed(2),
    profitFactor: profitFactor === 999 ? '∞' : profitFactor.toFixed(2),
    broker,
    winCount,
    lossCount,
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
  };
}
