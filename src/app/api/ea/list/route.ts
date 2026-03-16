import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eaProducts, eaPurchases } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 获取EA产品列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 获取所有上架的EA产品
    const products = await db
      .select()
      .from(eaProducts)
      .where(eq(eaProducts.status, 'active'));

    // 获取用户已购买的产品ID
    const purchases = await db
      .select({ productId: eaPurchases.productId })
      .from(eaPurchases)
      .where(and(
        eq(eaPurchases.userId, session.user.id),
        eq(eaPurchases.status, 'completed')
      ));

    const purchasedIds = new Set(purchases.map(p => p.productId));

    // 标记已购买的产品
    const productsWithPurchaseStatus = products.map(product => ({
      ...product,
      purchased: purchasedIds.has(product.id),
    }));

    return NextResponse.json({ products: productsWithPurchaseStatus });
  } catch (error) {
    console.error('Get EA products error:', error);
    return NextResponse.json({ error: '获取产品列表失败' }, { status: 500 });
  }
}
