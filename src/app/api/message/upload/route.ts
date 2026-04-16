import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Storage } from 'coze-coding-dev-sdk';

const storage = new S3Storage({
  bucketName: process.env.COZE_BUCKET_NAME,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '请上传图片' }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG、PNG、GIF、WebP 格式' }, { status: 400 });
    }

    // 限制文件大小 2MB
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过 2MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 上传到对象存储
    const fileName = `messages/${session.user.id}/${Date.now()}_${file.name}`;
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: file.type,
    });

    // 生成签名URL
    const imageUrl = await storage.generatePresignedUrl({
      key,
      expireTime: 86400 * 7, // 7天有效期
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      fileKey: key,
    });
  } catch (error) {
    console.error('Upload message image error:', error);
    return NextResponse.json(
      { error: '上传失败，请稍后重试' },
      { status: 500 }
    );
  }
}
