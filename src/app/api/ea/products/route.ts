import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eaProducts } from '@/lib/schema';
import { eq, asc } from 'drizzle-orm';

// 获取公开的EA产品列表（不需要登录）
export async function GET() {
  try {
    // 获取所有上架的EA产品 - 直接选择所有字段
    const products = await db
      .select()
      .from(eaProducts)
      .where(eq(eaProducts.status, 'active'))
      .orderBy(asc(eaProducts.createdAt));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('[EA Products API] Error:', error);
    return NextResponse.json({ 
      error: '获取产品列表失败',
      products: [] 
    }, { status: 500 });
  }
}
