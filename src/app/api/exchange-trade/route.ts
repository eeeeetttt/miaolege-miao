import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { exchanges, exchangeTrades, userAccounts } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 执行交易扣费
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { exchangeId, amount, tradeType = 'challenge', tradeId } = body;

    // 获取交易所
    const exchangeResult = await db
      .select()
      .from(exchanges)
      .where(eq(exchanges.exchangeId, exchangeId))
      .limit(1);

    if (!exchangeResult || exchangeResult.length === 0) {
      return NextResponse.json({ error: '交易所不存在' }, { status: 404 });
    }

    const exchange = exchangeResult[0];
    const feeRate = Number(exchange.feeRate || 0.002);
    const fee = Math.floor(Number(amount) * feeRate * 100) / 100;

    // 如果没有席主，不收取手续费
    if (!exchange.ownerId) {
      return NextResponse.json({
        success: true,
        fee: 0,
        message: '该交易所无席主，免收手续费',
      });
    }

    // 扣除用户手续费
    const userResult = await db
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.email, session.user.email))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = userResult[0];
    const userBalance = Number(user.coinBalance || 0);

    if (userBalance < fee) {
      return NextResponse.json({ error: `手续费不足，需要 ${fee.toLocaleString()} 两` }, { status: 400 });
    }

    // 扣除用户手续费
    await db
      .update(userAccounts)
      .set({ coinBalance: String(userBalance - fee) })
      .where(eq(userAccounts.email, session.user.email));

    // 增加席主收入
    const ownerResult = await db
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.userId, exchange.ownerId))
      .limit(1);

    if (ownerResult.length > 0) {
      const ownerBalance = Number(ownerResult[0].coinBalance || 0);
      await db
        .update(userAccounts)
        .set({ coinBalance: String(ownerBalance + fee) })
        .where(eq(userAccounts.userId, exchange.ownerId));
    }

    // 更新交易所累计手续费
    const totalFeeEarned = Number(exchange.totalFeeEarned || 0);
    await db
      .update(exchanges)
      .set({ totalFeeEarned: String(totalFeeEarned + fee) })
      .where(eq(exchanges.exchangeId, exchangeId));

    // 记录交易日志
    await db
      .insert(exchangeTrades)
      .values({
        userId: user.userId,
        exchangeId,
        tradeType: tradeType as 'challenge' | 'conquest' | 'shop' | 'other',
        tradeId: tradeId || null,
        amount: String(amount),
        fee: String(fee),
      });

    return NextResponse.json({
      success: true,
      fee,
      feeRate,
      exchangeName: exchange.name,
      newBalance: userBalance - fee,
      message: `扣除手续费 ${fee.toLocaleString()} 两`,
    });
  } catch (error) {
    console.error('Trade fee error:', error);
    return NextResponse.json({ error: '扣费失败' }, { status: 500 });
  }
}

// 获取交易记录
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exchangeId = searchParams.get('exchangeId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 获取用户信息
    const userResult = await db
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.email, session.user.email))
      .limit(1);

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const user = userResult[0];

    // 获取交易记录
    let query = db
      .select({
        id: exchangeTrades.id,
        exchangeId: exchangeTrades.exchangeId,
        tradeType: exchangeTrades.tradeType,
        tradeId: exchangeTrades.tradeId,
        amount: exchangeTrades.amount,
        fee: exchangeTrades.fee,
        createdAt: exchangeTrades.createdAt,
        exchangeName: exchanges.name,
      })
      .from(exchangeTrades)
      .leftJoin(exchanges, eq(exchangeTrades.exchangeId, exchanges.exchangeId))
      .where(eq(exchangeTrades.userId, user.userId))
      .orderBy(exchangeTrades.createdAt)
      .limit(limit);

    if (exchangeId) {
      query = db
        .select({
          id: exchangeTrades.id,
          exchangeId: exchangeTrades.exchangeId,
          tradeType: exchangeTrades.tradeType,
          tradeId: exchangeTrades.tradeId,
          amount: exchangeTrades.amount,
          fee: exchangeTrades.fee,
          createdAt: exchangeTrades.createdAt,
          exchangeName: exchanges.name,
        })
        .from(exchangeTrades)
        .leftJoin(exchanges, eq(exchangeTrades.exchangeId, exchanges.exchangeId))
        .where(eq(exchangeTrades.userId, user.userId))
        .orderBy(exchangeTrades.createdAt)
        .limit(limit);
    }

    const trades = await query;

    return NextResponse.json({
      trades: trades.map(t => ({
        ...t,
        amount: Number(t.amount),
        fee: Number(t.fee),
      })),
    });
  } catch (error) {
    console.error('Get trades error:', error);
    return NextResponse.json({ error: '获取交易记录失败' }, { status: 500 });
  }
}
