import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { exchanges, exchangeTrades, userAccounts } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allExchanges = await db
      .select()
      .from(exchanges)
      .orderBy(exchanges.price);

    return NextResponse.json({
      exchanges: allExchanges.map(ex => ({
        ...ex,
        feeRate: Number(ex.feeRate),
        price: Number(ex.price),
        totalFeeEarned: Number(ex.totalFeeEarned || 0),
      })),
    });
  } catch (error) {
    console.error('Get exchanges error:', error);
    return NextResponse.json({ error: '获取交易所列表失败' }, { status: 500 });
  }
}

// 扣交易手续费
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action, exchangeId, tradeAmount, tradeId } = body;

    // 获取用户信息
    const user = await db
      .select()
      .from(userAccounts)
      .where(eq(userAccounts.email, session.user.email))
      .limit(1);

    if (!user || user.length === 0) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (action === 'trade') {
      // 交易扣手续费
      const exchange = await db
        .select()
        .from(exchanges)
        .where(eq(exchanges.exchangeId, exchangeId))
        .limit(1);

      if (!exchange || exchange.length === 0) {
        return NextResponse.json({ error: '交易所不存在' }, { status: 404 });
      }

      const feeRate = Number(exchange[0].feeRate);
      const fee = tradeAmount * feeRate;
      const ownerId = exchange[0].ownerId;

      // 扣除用户手续费
      const userBalance = Number(user[0].coinBalance || 0);
      if (userBalance < fee) {
        return NextResponse.json({ error: '银两不足，无法支付手续费' }, { status: 400 });
      }

      // 更新用户余额
      await db
        .update(userAccounts)
        .set({ coinBalance: String(userBalance - fee) })
        .where(eq(userAccounts.email, session.user.email));

      // 记录交易手续费
      await db.insert(exchangeTrades).values({
        userId: user[0].userId,
        exchangeId,
        tradeType: tradeId?.startsWith('challenge') ? 'challenge' : 'other',
        tradeId: tradeId || null,
        amount: String(tradeAmount),
        fee: String(fee),
      });

      // 如果有席主，给席主加银两
      if (ownerId) {
        const owner = await db
          .select()
          .from(userAccounts)
          .where(eq(userAccounts.userId, ownerId))
          .limit(1);

        if (owner && owner.length > 0) {
          const ownerBalance = Number(owner[0].coinBalance || 0);
          await db
            .update(userAccounts)
            .set({ coinBalance: String(ownerBalance + fee) })
            .where(eq(userAccounts.userId, ownerId));

          // 更新交易所累计手续费
          const totalFee = Number(exchange[0].totalFeeEarned || 0);
          await db
            .update(exchanges)
            .set({ totalFeeEarned: String(totalFee + fee) })
            .where(eq(exchanges.exchangeId, exchangeId));
        }
      }

      return NextResponse.json({
        success: true,
        fee,
        feeRate,
        message: `扣除手续费 ${fee.toFixed(2)} 两`,
      });
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch (error) {
    console.error('Exchange trade error:', error);
    return NextResponse.json({ error: '交易失败' }, { status: 500 });
  }
}
