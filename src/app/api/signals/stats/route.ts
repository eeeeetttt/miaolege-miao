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
        broker: mtAccount.broker,
        platform: mtAccount.platform,
        isVerified: mtAccount.isVerified,
        ...stats,
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
  // 获取该账号的所有信号
  const accountSignals = await db
    .select()
    .from(signals)
    .where(eq(signals.senderAccount, accountNumber))
    .orderBy(desc(signals.createdAt));

  // 总交易笔数
  const totalTrades = accountSignals.length;

  // 计算盈亏
  let totalProfit = 0;
  let winCount = 0;
  let lossCount = 0;

  const profitHistory: { date: string; profit: number }[] = [];
  let cumulativeProfit = 0;

  for (const signal of accountSignals) {
    const profit = parseFloat(signal.dealProfit || '0');
    totalProfit += profit;

    if (profit > 0) winCount++;
    else if (profit < 0) lossCount++;

    // 累计收益曲线数据
    cumulativeProfit += profit;
    profitHistory.push({
      date: signal.createdAt ? new Date(signal.createdAt).toLocaleDateString() : '-',
      profit: cumulativeProfit,
    });
  }

  // 胜率
  const winRate = totalTrades > 0 ? (winCount / (winCount + lossCount) * 100) : 0;

  // 计算最大回撤
  let maxDrawdown = 0;
  let peak = 0;
  for (const point of profitHistory) {
    if (point.profit > peak) peak = point.profit;
    const drawdown = peak - point.profit;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // 计算盈亏比
  const avgWin = winCount > 0 ? totalProfit / winCount : 0;
  const avgLoss = lossCount > 0 ? Math.abs(totalProfit / lossCount) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  // 收益率（简化计算，假设初始资金10000）
  const initialCapital = 10000;
  const returnRate = ((totalProfit / initialCapital) * 100);

  return {
    totalProfit: totalProfit.toFixed(2),
    winRate: winRate.toFixed(2),
    totalTrades,
    returnRate: returnRate.toFixed(2),
    maxDrawdown: maxDrawdown.toFixed(2),
    profitFactor: profitFactor.toFixed(2),
    winCount,
    lossCount,
    profitHistory: profitHistory.slice(-30), // 最近30条记录
  };
}
