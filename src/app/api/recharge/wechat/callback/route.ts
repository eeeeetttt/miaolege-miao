import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 模拟微信支付回调（仅用于测试/沙箱环境）
// 在生产环境中，这个接口应该由微信支付服务器调用
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: '缺少订单号' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    // 查询订单
    const { data: order, error: orderError } = await supabase
      .from('wechat_recharge_orders')
      .select('*')
      .eq('order_id', orderId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    if (order.status === 'paid') {
      return NextResponse.json({ error: '订单已支付' }, { status: 400 });
    }

    // 更新订单状态为已支付
    const { error: updateError } = await supabase
      .from('wechat_recharge_orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('更新订单状态失败:', updateError);
      return NextResponse.json({ error: '支付失败' }, { status: 500 });
    }

    // 增加用户U余额
    try {
      const currentUser = await db
        .select({ coinBalance: users.coinBalance })
        .from(users)
        .where(eq(users.userId, session.user.id))
        .limit(1);

      if (currentUser.length > 0) {
        const newBalance = (currentUser[0].coinBalance || 0) + order.amount_u;
        await db
          .update(users)
          .set({ coinBalance: newBalance })
          .where(eq(users.userId, session.user.id));

        // 记录充值历史
        await supabase
          .from('recharge_history')
          .insert({
            user_id: session.user.id,
            amount: order.amount_u,
            currency: 'USDC',
            type: 'wechat',
            order_id: orderId,
            status: 'completed',
          });
      }
    } catch (dbError) {
      console.error('更新用户余额失败:', dbError);
      // 即使余额更新失败，订单仍然标记为已支付
    }

    return NextResponse.json({
      success: true,
      message: '支付成功！',
      data: {
        orderId: orderId,
        amountU: order.amount_u,
      },
    });
  } catch (error) {
    console.error('模拟支付回调失败:', error);
    return NextResponse.json({ error: '支付失败' }, { status: 500 });
  }
}
