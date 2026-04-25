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

// 获取图片
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: '缺少图片路径' }, { status: 400 });
    }

    // 生成签名 URL
    const imageUrl = await storage.generatePresignedUrl({
      key: path,
      expireTime: 3600, // 1小时有效期
    });

    // 重定向到签名 URL
    return NextResponse.redirect(imageUrl);
  } catch (error) {
    console.error('Get image error:', error);
    return NextResponse.json({ error: '获取图片失败' }, { status: 500 });
  }
}
