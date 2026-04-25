import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
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

    // 获取产品信息（原始 SQL）
    const [productRows] = await pool.query(
      'SELECT * FROM ea_products WHERE id = ?',
      [parseInt(productId)]
    );
    const product = (productRows as any[])[0];

    if (!product) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    // 免费产品无需购买检查，直接下载
    if (product.price === 0) {
      if (!product.download_url) {
        return NextResponse.json({ error: '下载文件不可用' }, { status: 404 });
      }
      
      // 直接返回存储路径，让前端处理下载
      return NextResponse.json({
        downloadUrl: product.download_url,
        fileName: product.file_name,
        direct: true,
      });
    }

    // 付费产品：检查用户是否已购买（原始 SQL）
    const [purchaseRows] = await pool.query(
      'SELECT id FROM ea_purchases WHERE user_id = ? AND product_id = ? AND status = ?',
      [session.user.id, parseInt(productId), 'completed']
    );

    if ((purchaseRows as any[]).length === 0) {
      return NextResponse.json({ error: '您还未购买此产品' }, { status: 403 });
    }

    if (!product.download_url) {
      return NextResponse.json({ error: '下载文件不可用' }, { status: 404 });
    }

    // 直接返回存储路径
    return NextResponse.json({ 
      downloadUrl: product.download_url,
      fileName: product.file_name,
      direct: true,
    });
  } catch (error) {
    console.error('Download EA error:', error);
    return NextResponse.json({ error: '获取下载链接失败' }, { status: 500 });
  }
}
