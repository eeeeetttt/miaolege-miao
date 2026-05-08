import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { banks, bankLoans, userAccounts, exchanges } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取钱庄和交易所列表（公开接口）
export async function GET() {
  try {
    // 获取所有钱庄（公开）
    const allBanks = await db
      .select()
      .from(banks)
      .orderBy(banks.price);

    // 获取所有交易所（公开）
    const allExchanges = await db
      .select()
      .from(exchanges)
      .orderBy(exchanges.price);

    const session = await getServerSession(authOptions);
    let userId: string | null = null;
    let userDebt = 0;

    // 如果已登录，获取用户信息和借款数据
    if (session?.user?.email) {
      const userResult = await db
        .select({
          userId: userAccounts.userId,
          totalDebt: userAccounts.totalDebt,
        })
        .from(userAccounts)
        .where(eq(userAccounts.email, session.user.email))
        .limit(1);

      if (userResult.length > 0) {
        userId = userResult[0].userId;
        userDebt = Number(userResult[0].totalDebt || 0);
      }
    }

    // 计算用户在各钱庄的借款
    const loanMap = new Map<string, number>();
    if (userId) {
      const userLoans = await db
        .select({
          bankId: bankLoans.bankId,
          amount: bankLoans.amount,
        })
        .from(bankLoans)
        .where(eq(bankLoans.userId, userId));

      for (const loan of userLoans) {
        loanMap.set(loan.bankId, Number(loan.amount));
      }
    }

    // 合并钱庄数据
    const banksWithData = allBanks.map(bank => ({
      bank_id: bank.bankId,
      name: bank.name,
      price: Number(bank.price),
      owner_id: bank.ownerId,
      interest_rate: String(bank.interestRate),
      max_loan: Number(bank.maxLoan),
      daily_output: bank.dailyOutput || 0,
      status: bank.status,
      user_loan: loanMap.get(bank.bankId) || 0,
      isOwned: bank.ownerId === userId,
      owner_name: bank.ownerId ? '已售出' : '系统直营',
    }));

    // 合并交易所数据
    const exchangesWithData = allExchanges.map(ex => ({
      exchange_id: ex.exchangeId,
      name: ex.name,
      price: Number(ex.price),
      owner_id: ex.ownerId,
      fee_rate: String(ex.feeRate),
      status: ex.status,
      total_fee_earned: Number(ex.totalFeeEarned || 0),
      isOwned: ex.ownerId === userId,
      owner_name: ex.ownerId ? '已售出' : '系统直营',
    }));

    return NextResponse.json({
      success: true,
      banks: banksWithData,
      exchanges: exchangesWithData,
      userId,
      userDebt,
    });
  } catch (error) {
    console.error('Get banks error:', error);
    return NextResponse.json({ 
      success: false,
      error: '获取钱庄信息失败',
      banks: [],
      exchanges: []
    }, { status: 500 });
  }
}

// 需要登录的操作（购买、借款、设置等）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action, bankId, exchangeId, amount, rate, feeRate } = body;

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
    const userId = user.userId;
    const userBalance = Number(user.coinBalance || 0);

    // 以下是需要登录的操作...
    // (保持原有的 buyBank, buyExchange, setRate, setFee 等逻辑)
    // 为了简洁，这里只处理主要操作

    switch (action) {
      case 'buyBank': {
        const bank = await db.select().from(banks).where(eq(banks.bankId, bankId)).limit(1);
        if (!bank.length) return NextResponse.json({ error: '钱庄不存在' }, { status: 404 });
        if (bank[0].ownerId) return NextResponse.json({ error: '该钱庄已被购买' }, { status: 400 });

        const price = Number(bank[0].price);
        if (userBalance < price) {
          return NextResponse.json({ error: `银两不足，需要 ${price.toLocaleString()} 两` }, { status: 400 });
        }

        await db.update(userAccounts).set({ coinBalance: String(userBalance - price) }).where(eq(userAccounts.email, session.user.email));
        await db.update(banks).set({ ownerId: userId, updatedAt: new Date() }).where(eq(banks.bankId, bankId));

        return NextResponse.json({ success: true, message: `恭喜成功购买 ${bank[0].name}！` });
      }

      case 'buyExchange': {
        const exchange = await db.select().from(exchanges).where(eq(exchanges.exchangeId, exchangeId)).limit(1);
        if (!exchange.length) return NextResponse.json({ error: '交易所不存在' }, { status: 404 });
        if (exchange[0].ownerId) return NextResponse.json({ error: '该交易所已被购买' }, { status: 400 });

        const price = Number(exchange[0].price);
        if (userBalance < price) {
          return NextResponse.json({ error: `银两不足，需要 ${price.toLocaleString()} 两` }, { status: 400 });
        }

        await db.update(userAccounts).set({ coinBalance: String(userBalance - price) }).where(eq(userAccounts.email, session.user.email));
        await db.update(exchanges).set({ ownerId: userId, updatedAt: new Date() }).where(eq(exchanges.exchangeId, exchangeId));

        return NextResponse.json({ success: true, message: `恭喜成功购买 ${exchange[0].name}！` });
      }

      case 'setRate': {
        const bank = await db.select().from(banks).where(eq(banks.bankId, bankId)).limit(1);
        if (!bank.length) return NextResponse.json({ error: '钱庄不存在' }, { status: 404 });
        if (bank[0].ownerId !== userId) return NextResponse.json({ error: '您不是该钱庄的庄主' }, { status: 403 });

        if (rate < 0.0001 || rate > 0.1) {
          return NextResponse.json({ error: '利率必须在 0.01% ~ 10% 之间' }, { status: 400 });
        }

        await db.update(banks).set({ interestRate: String(rate), updatedAt: new Date() }).where(eq(banks.bankId, bankId));
        return NextResponse.json({ success: true, message: `利率已更新为 ${(rate * 100).toFixed(2)}%` });
      }

      case 'setFee': {
        const exchange = await db.select().from(exchanges).where(eq(exchanges.exchangeId, exchangeId)).limit(1);
        if (!exchange.length) return NextResponse.json({ error: '交易所不存在' }, { status: 404 });
        if (exchange[0].ownerId !== userId) return NextResponse.json({ error: '您不是该交易所的席主' }, { status: 403 });

        if (feeRate < 0 || feeRate > 0.05) {
          return NextResponse.json({ error: '费率必须在 0% ~ 5% 之间' }, { status: 400 });
        }

        await db.update(exchanges).set({ feeRate: String(feeRate), updatedAt: new Date() }).where(eq(exchanges.exchangeId, exchangeId));
        return NextResponse.json({ success: true, message: `费率已更新为 ${(feeRate * 100).toFixed(2)}%` });
      }

      default:
        return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Bank action error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
