import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 获取充值配置
export async function GET(request: NextRequest) {
  try {
    const [rows] = await pool.query('SELECT * FROM recharge_config LIMIT 1') as [any[], any];
    
    if (rows.length === 0) {
      return NextResponse.json({
        enabled: true,
        minAmount: 10,
        maxAmount: 10000,
        methods: ['wechat', 'alipay', 'bank']
      });
    }
    
    return NextResponse.json({ config: rows[0] });
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

    const { amount, method } = await request.json();
    const userId = session.user.id;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '充值金额必须大于0' }, { status: 400 });
    }

    const orderId = `RC${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

    await pool.query(
      `INSERT INTO recharge_orders (order_id, user_id, amount, payment_method, status, created_at) 
       VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [orderId, userId, amount, method || 'wechat']
    );

    return NextResponse.json({
      success: true,
      orderId,
      amount,
      message: '充值订单创建成功'
    });
  } catch (error: any) {
    console.error('创建充值订单失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
