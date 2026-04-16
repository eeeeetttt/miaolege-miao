import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { signals, mtAccounts, planetMembers, planets } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';

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
  // 获取该账号的所有信号（按时间升序）
  const accountSignals = await db
    .select()
    .from(signals)
    .where(eq(signals.senderAccount, accountNumber))
    .orderBy(signals.createdAt);

  // 获取经纪商（优先从信号中获取）
  const brokerSignal = accountSignals.find(s => s.broker);
  const broker = brokerSignal?.broker || null;

  // 只统计平仓信号（按时间升序）
  const closeSignals = accountSignals
    .filter(s => s.signalType?.toLowerCase().includes('close'))
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

  // 总交易笔数
  const totalTrades = closeSignals.length;

  // 计算初始余额 - 使用与详情页一致的逻辑
  // 方法：从最新的余额反推初始余额
  let initialBalance = 10000; // 默认初始资金
  
  // 找到最新的有余额记录的信号
  const latestSignalWithBalance = [...accountSignals]
    .reverse()
    .find(s => s.balance && parseFloat(s.balance) > 0);
  
  if (latestSignalWithBalance && latestSignalWithBalance.balance) {
    const latestBalance = parseFloat(latestSignalWithBalance.balance);
    // 计算所有平仓信号的累计盈亏
    let cumulativeProfit = 0;
    for (const signal of closeSignals) {
      if (signal.dealProfit) {
        cumulativeProfit += parseFloat(signal.dealProfit);
      }
    }
    // 初始余额 = 最新余额 - 累计盈亏
    initialBalance = latestBalance - cumulativeProfit;
    // 确保初始余额为正数
    if (initialBalance <= 0) {
      const firstSignalWithBalance = closeSignals.find(s => s.balance && parseFloat(s.balance) > 0);
      if (firstSignalWithBalance && firstSignalWithBalance.balance) {
        initialBalance = parseFloat(firstSignalWithBalance.balance);
      } else {
        initialBalance = 10000;
      }
    }
  } else {
    // 如果没有余额记录，尝试从第一条平仓信号获取
    const firstCloseWithBalance = closeSignals.find(s => s.balance && parseFloat(s.balance) > 0);
    if (firstCloseWithBalance && firstCloseWithBalance.balance) {
      initialBalance = parseFloat(firstCloseWithBalance.balance);
    }
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
  
  for (const signal of closeSignals) {
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

  // 收益率
  const returnRate = initialBalance > 0 ? ((totalProfit / initialBalance) * 100) : 0;

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
