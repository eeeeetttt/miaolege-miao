import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eaPurchases } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 检查购买状态
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ purchased: false, error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: '缺少产品ID' }, { status: 400 });
    }

    // 检查购买记录
    const [purchase] = await db
      .select()
      .from(eaPurchases)
      .where(
        and(
          eq(eaPurchases.userId, session.user.id),
          eq(eaPurchases.productId, parseInt(productId)),
          eq(eaPurchases.status, 'completed')
        )
      )
      .limit(1);

    return NextResponse.json({ 
      purchased: !!purchase 
    });
  } catch (error) {
    console.error('Check purchase error:', error);
    return NextResponse.json({ purchased: false, error: '检查失败' }, { status: 500 });
  }
}
