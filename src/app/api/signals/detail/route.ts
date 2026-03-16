import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { signals, mtAccounts } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// 获取单个信号源的详细数据
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get('account');

    if (!accountNumber) {
      return NextResponse.json({ error: '缺少账号参数' }, { status: 400 });
    }

    // 获取MT账号信息
    const [mtAccount] = await db
      .select()
      .from(mtAccounts)
      .where(eq(mtAccounts.accountNumber, accountNumber))
      .limit(1);

    // 获取该账号的所有信号
    const accountSignals = await db
      .select()
      .from(signals)
      .where(eq(signals.senderAccount, accountNumber))
      .orderBy(desc(signals.createdAt));

    // 计算详细统计
    const stats = calculateDetailedStats(accountSignals);

    return NextResponse.json({
      account: mtAccount || { accountNumber },
      signals: accountSignals,
      stats,
    });
  } catch (error) {
    console.error('Get signal detail error:', error);
    return NextResponse.json({ error: '获取信号详情失败' }, { status: 500 });
  }
}

function calculateDetailedStats(accountSignals: any[]) {
  const totalTrades = accountSignals.length;
  
  let totalProfit = 0;
  let winCount = 0;
  let lossCount = 0;
  let maxProfit = 0;
  let maxLoss = 0;
  
  const profitHistory: { date: string; profit: number }[] = [];
  const symbolStats: Record<string, { count: number; profit: number; win: number; loss: number }> = {};
  const directionStats = { buy: { count: 0, profit: 0 }, sell: { count: 0, profit: 0 } };
  
  let cumulativeProfit = 0;
  let peak = 0;
  let maxDrawdown = 0;

  for (const signal of accountSignals) {
    const profit = parseFloat(signal.dealProfit || '0');
    totalProfit += profit;

    if (profit > 0) {
      winCount++;
      if (profit > maxProfit) maxProfit = profit;
    } else if (profit < 0) {
      lossCount++;
      if (profit < maxLoss) maxLoss = profit;
    }

    // 累计收益曲线
    cumulativeProfit += profit;
    profitHistory.push({
      date: new Date(signal.createdAt).toLocaleDateString(),
      profit: cumulativeProfit,
    });

    // 最大回撤计算
    if (cumulativeProfit > peak) peak = cumulativeProfit;
    const drawdown = peak - cumulativeProfit;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    // 品种统计
    const symbol = signal.symbol || 'Unknown';
    if (!symbolStats[symbol]) {
      symbolStats[symbol] = { count: 0, profit: 0, win: 0, loss: 0 };
    }
    symbolStats[symbol].count++;
    symbolStats[symbol].profit += profit;
    if (profit > 0) symbolStats[symbol].win++;
    else if (profit < 0) symbolStats[symbol].loss++;

    // 方向统计
    if (signal.orderType === 'BUY') {
      directionStats.buy.count++;
      directionStats.buy.profit += profit;
    } else if (signal.orderType === 'SELL') {
      directionStats.sell.count++;
      directionStats.sell.profit += profit;
    }
  }

  const winRate = totalTrades > 0 ? (winCount / (winCount + lossCount) * 100) : 0;
  const avgWin = winCount > 0 ? totalProfit / winCount : 0;
  const avgLoss = lossCount > 0 ? Math.abs(totalProfit / lossCount) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  
  const initialCapital = 10000;
  const returnRate = ((totalProfit / initialCapital) * 100);

  return {
    totalTrades,
    winCount,
    lossCount,
    totalProfit: totalProfit.toFixed(2),
    winRate: winRate.toFixed(2),
    returnRate: returnRate.toFixed(2),
    maxDrawdown: maxDrawdown.toFixed(2),
    profitFactor: profitFactor.toFixed(2),
    maxProfit: maxProfit.toFixed(2),
    maxLoss: maxLoss.toFixed(2),
    avgWin: avgWin.toFixed(2),
    avgLoss: avgLoss.toFixed(2),
    profitHistory: profitHistory.slice(-60),
    symbolStats,
    directionStats,
  };
}
