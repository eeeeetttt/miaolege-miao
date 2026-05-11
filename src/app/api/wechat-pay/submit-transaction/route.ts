import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { applicationId, transactionId } = await request.json();

    if (!applicationId || !transactionId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 使用 MySQL 更新充值申请记录
    const [result] = await db.execute({
      sql: `UPDATE recharge_applications SET transaction_id = ?, status = 'pending', updated_at = NOW() WHERE id = ?`,
      args: [transactionId, applicationId]
    });

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('提交交易单号错误:', err);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
