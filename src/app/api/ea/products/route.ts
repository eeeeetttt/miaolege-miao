import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eaProducts } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 获取公开的EA产品列表（不需要登录）
export async function GET() {
  try {
    // 获取所有上架的EA产品
    const products = await db
      .select({
        id: eaProducts.id,
        name: eaProducts.name,
        description: eaProducts.description,
        price: eaProducts.price,
        version: eaProducts.version,
        platform: eaProducts.platform,
        category: eaProducts.category,
        features: eaProducts.features,
        productType: eaProducts.productType,
        createdAt: eaProducts.createdAt,
      })
      .from(eaProducts)
      .where(eq(eaProducts.status, 'active'));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get EA products error:', error);
    return NextResponse.json({ 
      error: '获取产品列表失败',
      products: [] 
    }, { status: 500 });
  }
}
