import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 上传图片
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'image'; // image or ea

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '只支持 JPG、PNG、GIF、WebP 格式的图片' }, { status: 400 });
    }

    // 检查文件大小 (最大 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: '图片大小不能超过 5MB' }, { status: 400 });
    }

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = file.name.replace(/\.[^/.]+$/, ''); // 去掉扩展名的文件名
    const safeName = fileName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_'); // 中文和特殊字符处理
    const key = `uploads/${type}/${session.user.id}/${timestamp}_${safeName}_${randomStr}.${ext}`;

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 上传到对象存储
    await storage.uploadFile({
      fileName: key,
      fileContent: buffer,
      contentType: file.type,
    });

    // 返回文件访问路径
    const fileUrl = key;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
