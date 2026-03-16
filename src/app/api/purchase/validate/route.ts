import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eaPurchases, eaProducts } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

/**
 * MT5 EA 验证购买权限接口
 * 
 * 请求参数：
 * - userId: 用户ID
 * - productId: 产品ID (eaProducts.id)
 * - mtAccount: MT账户号码（可选）
 * 
 * 返回：
 * - valid: 是否有效
 * - product: 产品信息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, productId, mtAccount } = body;

    if (!userId || !productId) {
      return NextResponse.json(
        { valid: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 查询购买记录
    const purchases = await db
      .select({
        purchase: eaPurchases,
        product: eaProducts,
      })
      .from(eaPurchases)
      .innerJoin(eaProducts, eq(eaPurchases.productId, eaProducts.id))
      .where(
        and(
          eq(eaPurchases.userId, userId),
          eq(eaPurchases.productId, productId)
        )
      );

    if (purchases.length === 0) {
      return NextResponse.json({
        valid: false,
        error: '未找到购买记录',
      });
    }

    const { purchase, product } = purchases[0];

    // EA默认授权30天（可根据业务调整）
    const purchasedAt = purchase.purchasedAt || new Date();
    const expiresAt = new Date(purchasedAt);
    expiresAt.setDate(expiresAt.getDate() + 30);

    const now = new Date();
    
    // 检查是否过期
    if (now > expiresAt) {
      return NextResponse.json({
        valid: false,
        error: '授权已过期',
        expiredAt: expiresAt.toISOString(),
      });
    }

    // 计算剩余天数
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

    // 检查购买状态
    if (purchase.status === 'refunded') {
      return NextResponse.json({
        valid: false,
        error: '订单已退款',
      });
    }

    return NextResponse.json({
      valid: true,
      purchaseId: purchase.id,
      expiresAt: expiresAt.toISOString(),
      remainingDays,
      product: {
        id: product.id,
        name: product.name,
        version: product.version,
        platform: product.platform,
      },
    });

  } catch (error) {
    console.error('Validate purchase error:', error);
    return NextResponse.json(
      { valid: false, error: '验证失败' },
      { status: 500 }
    );
  }
}
