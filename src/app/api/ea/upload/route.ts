import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Storage } from 'coze-coding-dev-sdk';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { createClient } from '@supabase/supabase-js';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 获取管理员客户端
function getSupabaseAdmin() {
  const supabaseUrl = process.env.COZE_SUPABASE_URL;
  const supabaseServiceKey = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
  return createClient(supabaseUrl!, supabaseServiceKey!, { auth: { persistSession: false } });
}

// 上传EA文件
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json({ error: '缺少产品ID' }, { status: 400 });
    }

    // 检查文件类型
    const allowedTypes = ['.ex4', '.ex5', '.mq4', '.mq5'];
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedTypes.some(ext => fileName.endsWith(ext));
    
    if (!isAllowed) {
      return NextResponse.json({ 
        error: '仅支持 .ex4, .ex5, .mq4, .mq5 格式的文件' 
      }, { status: 400 });
    }

    // 读取文件内容
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileSizeKB = Math.round(fileBuffer.length / 1024);

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: fileBuffer,
      fileName: `ea-files/${productId}_${file.name}`,
      contentType: 'application/octet-stream',
    });

    const supabaseAdmin = getSupabaseAdmin();

    // 更新产品记录
    const { error } = await supabaseAdmin
      .from('ea_products')
      .update({
        download_url: fileKey, // 存储 key，下载时再生成签名 URL
        file_name: file.name,
        file_size: fileSizeKB,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parseInt(productId));

    if (error) {
      console.error('Failed to update product:', error);
      return NextResponse.json({ error: '数据库更新失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '文件上传成功',
      fileKey,
      fileName: file.name,
      fileSize: fileSizeKB,
    });
  } catch (error) {
    console.error('Upload EA file error:', error);
    return NextResponse.json({ 
      error: '上传失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
