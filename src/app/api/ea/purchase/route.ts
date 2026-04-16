import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eaProducts, eaPurchases, users } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 购买EA产品
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: '缺少产品ID' }, { status: 400 });
    }

    // 获取产品信息
    const [product] = await db
      .select()
      .from(eaProducts)
      .where(eq(eaProducts.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    if (product.status !== 'active') {
      return NextResponse.json({ error: '该产品已下架' }, { status: 400 });
    }

    // 检查是否已购买
    const [existingPurchase] = await db
      .select()
      .from(eaPurchases)
      .where(and(
        eq(eaPurchases.userId, session.user.id),
        eq(eaPurchases.productId, productId)
      ))
      .limit(1);

    if (existingPurchase) {
      return NextResponse.json({ error: '您已购买过此产品' }, { status: 400 });
    }

    // 获取用户余额
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.userId, session.user.id))
      .limit(1);

    if (!user || (user.coinBalance ?? 0) < product.price) {
      return NextResponse.json({ error: 'U 余额不足' }, { status: 400 });
    }

    // 开始事务：扣除余额、创建购买记录、更新销量
    // 1. 扣除用户余额
    await db
      .update(users)
      .set({ 
        coinBalance: (user.coinBalance ?? 0) - product.price,
        updatedAt: new Date(),
      })
      .where(eq(users.userId, session.user.id));

    // 2. 创建购买记录
    await db.insert(eaPurchases).values({
      userId: session.user.id,
      productId: productId,
      price: product.price,
      status: 'completed',
    });

    // 3. 更新产品销量
    await db
      .update(eaProducts)
      .set({ 
        salesCount: (product.salesCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(eaProducts.id, productId));

    return NextResponse.json({ 
      success: true, 
      message: '购买成功',
      price: product.price,
    });
  } catch (error) {
    console.error('Purchase EA error:', error);
    return NextResponse.json({ error: '购买失败' }, { status: 500 });
  }
}
