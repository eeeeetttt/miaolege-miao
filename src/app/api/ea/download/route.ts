import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
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

    const supabase = getSupabaseClient();

    if (!supabase) {
      return NextResponse.json({ error: '数据库连接失败' }, { status: 500 });
    }

    // 先获取产品信息，检查是否为免费产品
    const { data: product, error: productError } = await supabase
      .from('ea_products')
      .select('price, download_url, file_name')
      .eq('id', parseInt(productId))
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: '产品不存在' }, { status: 404 });
    }

    // 免费产品无需购买检查，直接下载
    if (product.price === 0) {
      if (!product.download_url) {
        return NextResponse.json({ error: '下载文件不可用' }, { status: 404 });
      }
      // 生成签名下载链接（有效期1小时）
      const downloadUrl = await storage.generatePresignedUrl({
        key: product.download_url,
        expireTime: 3600,
      });

      return NextResponse.json({
        downloadUrl,
        fileName: product.file_name,
      });
    }

    // 付费产品：检查用户是否已购买
    const { data: purchase } = await supabase
      .from('ea_purchases')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('product_id', parseInt(productId))
      .eq('status', 'completed')
      .single();

    if (!purchase) {
      return NextResponse.json({ error: '您还未购买此产品' }, { status: 403 });
    }

    if (!product.download_url) {
      return NextResponse.json({ error: '下载文件不可用' }, { status: 404 });
    }

    // 生成签名下载链接（有效期1小时）
    const downloadUrl = await storage.generatePresignedUrl({
      key: product.download_url,
      expireTime: 3600,
    });

    return NextResponse.json({ 
      downloadUrl,
      fileName: product.file_name,
    });
  } catch (error) {
    console.error('Download EA error:', error);
    return NextResponse.json({ error: '获取下载链接失败' }, { status: 500 });
  }
}
