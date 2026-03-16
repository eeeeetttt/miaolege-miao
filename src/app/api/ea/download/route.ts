import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eaProducts, eaPurchases } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

// 获取EA下载链接
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: '缺少产品ID' }, { status: 400 });
    }

    // 检查用户是否已购买
    const [purchase] = await db
      .select()
      .from(eaPurchases)
      .where(and(
        eq(eaPurchases.userId, session.user.id),
        eq(eaPurchases.productId, parseInt(productId)),
        eq(eaPurchases.status, 'completed')
      ))
      .limit(1);

    if (!purchase) {
      return NextResponse.json({ error: '您还未购买此产品' }, { status: 403 });
    }

    // 获取产品信息
    const [product] = await db
      .select()
      .from(eaProducts)
      .where(eq(eaProducts.id, parseInt(productId)))
      .limit(1);

    if (!product || !product.downloadUrl) {
      return NextResponse.json({ error: '下载链接不可用' }, { status: 404 });
    }

    // 返回下载链接
    // 如果downloadUrl是对象存储的链接，可以生成带签名的临时链接
    // 这里直接返回原始链接，实际生产环境应该生成临时签名URL
    
    return NextResponse.json({ 
      downloadUrl: product.downloadUrl,
      fileName: product.fileName,
    });
  } catch (error) {
    console.error('Download EA error:', error);
    return NextResponse.json({ error: '获取下载链接失败' }, { status: 500 });
  }
}
