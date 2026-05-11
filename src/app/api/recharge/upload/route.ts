import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 上传充值凭证
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { orderId, voucherImage } = await request.json();

    await pool.query(
      'UPDATE recharge_orders SET voucher_image = ?, status = ? WHERE order_id = ?',
      [voucherImage || '', 'pending_review', orderId]
    );

    return NextResponse.json({ success: true, message: '凭证上传成功' });
  } catch (error: any) {
    console.error('上传凭证失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
