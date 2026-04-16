import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { eaProducts, eaPurchases } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

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
      return NextResponse.json({ error: '下载文件不可用' }, { status: 404 });
    }

    // 生成签名下载链接（有效期1小时）
    const downloadUrl = await storage.generatePresignedUrl({
      key: product.downloadUrl,
      expireTime: 3600,
    });

    return NextResponse.json({ 
      downloadUrl,
      fileName: product.fileName,
    });
  } catch (error) {
    console.error('Download EA error:', error);
    return NextResponse.json({ error: '获取下载链接失败' }, { status: 500 });
  }
}
