import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eaProducts } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// 获取当前用户的产品列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 普通用户只能看到自己创建的产品
    const products = await db
      .select()
      .from(eaProducts)
      .where(eq(eaProducts.creatorId, session.user.id))
      .orderBy(desc(eaProducts.createdAt));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get my products error:', error);
    return NextResponse.json({ error: '获取产品列表失败' }, { status: 500 });
  }
}
