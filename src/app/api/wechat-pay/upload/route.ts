import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 上传充值凭证（管理员）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { orderId, status, adminNote } = await request.json();

    await pool.query(
      'UPDATE recharge_orders SET status = ?, admin_note = ?, processed_at = NOW() WHERE order_id = ?',
      [status, adminNote || '', orderId]
    );

    // 如果确认充值，增加用户余额
    if (status === 'completed') {
      const [orders] = await pool.query(
        'SELECT user_id, amount FROM recharge_orders WHERE order_id = ?',
        [orderId]
      ) as [any[], any];
      
      if (orders.length > 0) {
        const order = orders[0];
        await pool.query(
          'UPDATE user_accounts SET coin_balance = coin_balance + ? WHERE user_id = ?',
          [order.amount, order.user_id]
        );
      }
    }

    return NextResponse.json({ success: true, message: '充值凭证已更新' });
  } catch (error: any) {
    console.error('上传凭证失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
