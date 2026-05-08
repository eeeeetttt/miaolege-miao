import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, coinRecharges } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// 获取充值记录
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const records = await db
      .select()
      .from(coinRecharges)
      .where(eq(coinRecharges.userId, session.user.id))
      .orderBy(desc(coinRecharges.createdAt))
      .limit(20);

    return NextResponse.json({ records });
  } catch (error) {
    console.error('获取充值记录失败:', error);
    return NextResponse.json({ error: '获取充值记录失败' }, { status: 500 });
  }
}

// 创建充值订单
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, paymentMethod } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '充值金额无效' }, { status: 400 });
    }

    if (amount < 10 || amount > 50000) {
      return NextResponse.json({ error: '充值金额需在10-50000之间' }, { status: 400 });
    }

    // 创建充值记录 (MySQL不支持returning，需要先插入再查询)
    const result = await db
      .insert(coinRecharges)
      .values({
        userId: session.user.id,
        amount,
        paymentMethod: paymentMethod || 'manual',
        status: 'pending',
      });

    const rechargeId = result[0].insertId;

    // 模拟支付成功（实际项目中需要对接支付系统）
    // 这里直接将状态改为完成并增加余额
    await db.transaction(async (tx) => {
      // 更新充值状态
      await tx
        .update(coinRecharges)
        .set({
          status: 'completed',
          processedAt: new Date(),
          transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        })
        .where(eq(coinRecharges.id, rechargeId));

      // 获取当前用户余额
      const [user] = await tx
        .select({ coinBalance: users.coinBalance })
        .from(users)
        .where(eq(users.userId, session.user.id));

      // 更新用户余额
      await tx
        .update(users)
        .set({
          coinBalance: String(Number(user.coinBalance || 0) + amount),
          updatedAt: new Date(),
        })
        .where(eq(users.userId, session.user.id));
    });

    return NextResponse.json({
      success: true,
      message: '充值成功',
      rechargeId,
      amount,
    });
  } catch (error) {
    console.error('充值失败:', error);
    return NextResponse.json({ error: '充值失败，请稍后重试' }, { status: 500 });
  }
}
