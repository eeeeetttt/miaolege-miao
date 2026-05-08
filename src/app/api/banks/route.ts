import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { banks, bankLoans, userAccounts, exchanges, userTitles } from '@/lib/schema';
import { eq, sql, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 获取所有钱庄
    const allBanks = await db
      .select()
      .from(banks)
      .orderBy(banks.price);

    // 获取用户的借款信息
    const userLoans = await db
      .select()
      .from(bankLoans)
      .innerJoin(userAccounts, eq(bankLoans.userId, userAccounts.userId))
      .where(eq(userAccounts.email, session.user.email));

    // 计算各钱庄的借款总额
    const loanMap = new Map<string, number>();
    for (const loan of userLoans) {
      const current = loanMap.get(loan.bank_loans!.bankId) || 0;
      loanMap.set(loan.bank_loans!.bankId, current + Number(loan.bank_loans!.amount));
    }

    // 合并钱庄和借款信息
    const banksWithLoans = allBanks.map(bank => ({
      ...bank,
      interestRate: Number(bank.interestRate),
      price: Number(bank.price),
      maxLoan: Number(bank.maxLoan),
      currentLoan: loanMap.get(bank.bankId) || 0,
      ownerName: bank.ownerId ? '已售出' : '系统直营',
      isOwned: !!bank.ownerId,
    }));

    // 获取所有交易所
    const allExchanges = await db
      .select()
      .from(exchanges)
      .orderBy(exchanges.price);

    const exchangesWithData = allExchanges.map(ex => ({
      ...ex,
      feeRate: Number(ex.feeRate),
      price: Number(ex.price),
      totalFeeEarned: Number(ex.totalFeeEarned || 0),
      ownerName: ex.ownerId ? '已售出' : '系统直营',
      isOwned: !!ex.ownerId,
    }));

    return NextResponse.json({
      banks: banksWithLoans,
      exchanges: exchangesWithData,
    });
  } catch (error) {
    console.error('Get banks error:', error);
    return NextResponse.json({ error: '获取钱庄信息失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action, bankId, exchangeId, amount } = body;

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
    const userDebt = Number(user.totalDebt || 0);

    switch (action) {
      case 'buyBank': {
        // 购买钱庄
        const bank = await db
          .select()
          .from(banks)
          .where(eq(banks.bankId, bankId))
          .limit(1);

        if (!bank || bank.length === 0) {
          return NextResponse.json({ error: '钱庄不存在' }, { status: 404 });
        }

        if (bank[0].ownerId) {
          return NextResponse.json({ error: '该钱庄已被购买' }, { status: 400 });
        }

        const price = Number(bank[0].price);
        if (userBalance < price) {
          return NextResponse.json({ error: `银两不足，需要 ${price.toLocaleString()} 两` }, { status: 400 });
        }

        await db
          .update(userAccounts)
          .set({ coinBalance: String(userBalance - price) })
          .where(eq(userAccounts.email, session.user.email));

        await db
          .update(banks)
          .set({ ownerId: userId, updatedAt: new Date() })
          .where(eq(banks.bankId, bankId));

        // 给用户称号：金融巨鳄
        const titles = await db
          .select()
          .from(userTitles)
          .where(eq(userTitles.userId, userId));

        const hasTycoonTitle = titles.some(t => t.titleId === 'title_tycoon');
        if (!hasTycoonTitle) {
          await db.insert(userTitles).values({
            userId,
            titleId: 'title_tycoon',
            isActive: false,
          });
        }

        return NextResponse.json({
          success: true,
          message: `恭喜成功购买 ${bank[0].name}！`,
        });
      }

      case 'buyExchange': {
        // 购买交易所
        const exchange = await db
          .select()
          .from(exchanges)
          .where(eq(exchanges.exchangeId, exchangeId))
          .limit(1);

        if (!exchange || exchange.length === 0) {
          return NextResponse.json({ error: '交易所不存在' }, { status: 404 });
        }

        if (exchange[0].ownerId) {
          return NextResponse.json({ error: '该交易所已被购买' }, { status: 400 });
        }

        const price = Number(exchange[0].price);
        if (userBalance < price) {
          return NextResponse.json({ error: `银两不足，需要 ${price.toLocaleString()} 两` }, { status: 400 });
        }

        await db
          .update(userAccounts)
          .set({ coinBalance: String(userBalance - price) })
          .where(eq(userAccounts.email, session.user.email));

        await db
          .update(exchanges)
          .set({ ownerId: userId, updatedAt: new Date() })
          .where(eq(exchanges.exchangeId, exchangeId));

        // 给用户称号
        const titles = await db
          .select()
          .from(userTitles)
          .where(eq(userTitles.userId, userId));

        const hasTycoonTitle = titles.some(t => t.titleId === 'title_tycoon');
        if (!hasTycoonTitle) {
          await db.insert(userTitles).values({
            userId,
            titleId: 'title_tycoon',
            isActive: false,
          });
        }

        return NextResponse.json({
          success: true,
          message: `恭喜成功购买 ${exchange[0].name}！`,
        });
      }

      case 'setRate': {
        // 设置利率
        const bank = await db
          .select()
          .from(banks)
          .where(eq(banks.bankId, bankId))
          .limit(1);

        if (!bank || bank.length === 0) {
          return NextResponse.json({ error: '钱庄不存在' }, { status: 404 });
        }

        if (bank[0].ownerId !== userId) {
          return NextResponse.json({ error: '您不是该钱庄的庄主' }, { status: 403 });
        }

        const { rate } = body;
        if (rate < 0.0001 || rate > 0.1) {
          return NextResponse.json({ error: '利率必须在 0.01% ~ 10% 之间' }, { status: 400 });
        }

        await db
          .update(banks)
          .set({ interestRate: String(rate), updatedAt: new Date() })
          .where(eq(banks.bankId, bankId));

        return NextResponse.json({
          success: true,
          message: `利率已更新为 ${(rate * 100).toFixed(2)}%`,
        });
      }

      case 'setFee': {
        // 设置费率
        const exchange = await db
          .select()
          .from(exchanges)
          .where(eq(exchanges.exchangeId, exchangeId))
          .limit(1);

        if (!exchange || exchange.length === 0) {
          return NextResponse.json({ error: '交易所不存在' }, { status: 404 });
        }

        if (exchange[0].ownerId !== userId) {
          return NextResponse.json({ error: '您不是该交易所的席主' }, { status: 403 });
        }

        const { feeRate } = body;
        if (feeRate < 0 || feeRate > 0.05) {
          return NextResponse.json({ error: '费率必须在 0% ~ 5% 之间' }, { status: 400 });
        }

        await db
          .update(exchanges)
          .set({ feeRate: String(feeRate), updatedAt: new Date() })
          .where(eq(exchanges.exchangeId, exchangeId));

        return NextResponse.json({
          success: true,
          message: `费率已更新为 ${(feeRate * 100).toFixed(2)}%`,
        });
      }

      default:
        return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('Bank action error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}
