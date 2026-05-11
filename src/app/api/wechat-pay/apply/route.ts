import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 获取充值配置
export async function GET(request: NextRequest) {
  try {
    const [rows] = await pool.query('SELECT * FROM recharge_config WHERE enabled = 1 LIMIT 1') as [any[], any];
    
    if (rows.length === 0) {
      return NextResponse.json({ enabled: false });
    }
    
    return NextResponse.json({
      enabled: true,
      config: rows[0]
    });
  } catch (error: any) {
    console.error('获取充值配置失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 创建充值订单
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { amount } = await request.json();
    const userId = session.user.id;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '充值金额必须大于0' }, { status: 400 });
    }

    const orderId = `WX${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      'INSERT INTO recharge_orders (order_id, user_id, amount, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [orderId, userId, amount, 'pending']
    );

    return NextResponse.json({
      success: true,
      orderId,
      amount,
      message: '充值订单创建成功，请完成支付'
    });
  } catch (error: any) {
    console.error('创建充值订单失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
