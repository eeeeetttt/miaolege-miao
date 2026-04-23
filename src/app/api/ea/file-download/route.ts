import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 文件下载处理
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const fileName = searchParams.get('fileName') || 'download';

    if (!key) {
      return NextResponse.json({ error: '缺少文件路径' }, { status: 400 });
    }

    // 生成签名下载链接（有效期1小时）
    const downloadUrl = await storage.generatePresignedUrl({
      key: key,
      expireTime: 3600,
    });

    // 重定向到签名URL
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json({ error: '下载失败' }, { status: 500 });
  }
}
