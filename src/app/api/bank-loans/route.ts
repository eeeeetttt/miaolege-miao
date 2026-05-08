import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { bankLoans, banks, userAccounts } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 借款
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { action, bankId, amount } = body;

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

    if (action === 'borrow') {
      // 借款
      const bankResult = await db
        .select()
        .from(banks)
        .where(eq(banks.bankId, bankId))
        .limit(1);

      if (!bankResult || bankResult.length === 0) {
        return NextResponse.json({ error: '钱庄不存在' }, { status: 404 });
      }

      const bank = bankResult[0];
      const maxLoan = Number(bank.maxLoan || 1000000);
      const borrowAmount = Number(amount);

      if (borrowAmount <= 0) {
        return NextResponse.json({ error: '借款金额必须大于0' }, { status: 400 });
      }

      // 检查单次借款上限
      if (borrowAmount > maxLoan) {
        return NextResponse.json({ error: `单次借款不能超过 ${maxLoan.toLocaleString()} 两` }, { status: 400 });
      }

      // 检查该钱庄已有借款
      const existingLoan = await db
        .select()
        .from(bankLoans)
        .where(eq(bankLoans.userId, userId))
        .limit(1);

      let currentLoanInBank = 0;
      if (existingLoan.length > 0) {
        currentLoanInBank = Number(existingLoan[0].amount);
      }

      // 如果用户在银行已有借款，检查总额是否超过上限
      if (existingLoan.length > 0 && (currentLoanInBank + borrowAmount) > maxLoan) {
        return NextResponse.json({ error: `该钱庄累计借款不能超过 ${maxLoan.toLocaleString()} 两` }, { status: 400 });
      }

      // 增加用户现金
      await db
        .update(userAccounts)
        .set({ coinBalance: String(userBalance + borrowAmount) })
        .where(eq(userAccounts.email, session.user.email));

      // 更新或创建借款记录
      if (existingLoan.length > 0) {
        await db
          .update(bankLoans)
          .set({ 
            amount: String(currentLoanInBank + borrowAmount),
            lastInterestDate: new Date()
          })
          .where(eq(bankLoans.userId, userId));
      } else {
        await db
          .insert(bankLoans)
          .values({
            userId,
            bankId,
            amount: String(borrowAmount),
            lastInterestDate: new Date(),
          });
      }

      // 更新用户总负债
      await db
        .update(userAccounts)
        .set({ totalDebt: String(userDebt + borrowAmount) })
        .where(eq(userAccounts.email, session.user.email));

      return NextResponse.json({
        success: true,
        message: `成功借款 ${borrowAmount.toLocaleString()} 两`,
        newBalance: userBalance + borrowAmount,
        newDebt: userDebt + borrowAmount,
      });
    }

    if (action === 'repay') {
      // 还款
      const repayAmount = Number(amount);

      if (repayAmount <= 0) {
        return NextResponse.json({ error: '还款金额必须大于0' }, { status: 400 });
      }

      if (repayAmount > userBalance) {
        return NextResponse.json({ error: '现金不足' }, { status: 400 });
      }

      // 获取该钱庄的借款
      const loanResult = await db
        .select()
        .from(bankLoans)
        .where(eq(bankLoans.userId, userId))
        .limit(1);

      if (!loanResult || loanResult.length === 0) {
        return NextResponse.json({ error: '该钱庄无欠款' }, { status: 400 });
      }

      const currentDebt = Number(loanResult[0].amount);
      const actualRepay = Math.min(repayAmount, currentDebt);

      // 扣除现金
      await db
        .update(userAccounts)
        .set({ coinBalance: String(userBalance - actualRepay) })
        .where(eq(userAccounts.email, session.user.email));

      // 更新借款记录
      const remainingDebt = currentDebt - actualRepay;
      if (remainingDebt <= 0) {
        await db
          .delete(bankLoans)
          .where(eq(bankLoans.userId, userId));
      } else {
        await db
          .update(bankLoans)
          .set({ amount: String(remainingDebt) })
          .where(eq(bankLoans.userId, userId));
      }

      // 更新用户总负债
      await db
        .update(userAccounts)
        .set({ totalDebt: String(Math.max(0, userDebt - actualRepay)) })
        .where(eq(userAccounts.email, session.user.email));

      return NextResponse.json({
        success: true,
        message: `成功还款 ${actualRepay.toLocaleString()} 两`,
        newBalance: userBalance - actualRepay,
        newDebt: Math.max(0, userDebt - actualRepay),
      });
    }

    return NextResponse.json({ error: '无效操作' }, { status: 400 });
  } catch (error) {
    console.error('Loan error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// 获取用户借款信息
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 获取用户借款
    const loans = await db
      .select({
        id: bankLoans.id,
        bankId: bankLoans.bankId,
        amount: bankLoans.amount,
        lastInterestDate: bankLoans.lastInterestDate,
        bankName: banks.name,
        interestRate: banks.interestRate,
        maxLoan: banks.maxLoan,
      })
      .from(bankLoans)
      .leftJoin(banks, eq(bankLoans.bankId, banks.bankId))
      .where(eq(bankLoans.userId, session.user.id!));

    // 获取用户总负债
    const user = await db
      .select({ totalDebt: userAccounts.totalDebt })
      .from(userAccounts)
      .where(eq(userAccounts.email, session.user.email))
      .limit(1);

    return NextResponse.json({
      loans: loans.map(l => ({
        ...l,
        amount: Number(l.amount),
        interestRate: Number(l.interestRate),
        maxLoan: Number(l.maxLoan),
      })),
      totalDebt: Number(user[0]?.totalDebt || 0),
    });
  } catch (error) {
    console.error('Get loans error:', error);
    return NextResponse.json({ error: '获取借款信息失败' }, { status: 500 });
  }
}
