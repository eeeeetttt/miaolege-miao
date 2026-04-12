import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: '未上传文件' }, { status: 400 });
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: '只能上传图片文件' }, { status: 400 });
    }

    // 验证文件大小 (最大5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: '图片大小不能超过5MB' }, { status: 400 });
    }

    // 将文件转换为base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    // 返回base64数据URL（实际应用中，这里应该上传到云存储）
    // 简化处理：直接返回base64数据URL
    return NextResponse.json({
      success: true,
      url: dataUri,
      message: '截图上传成功',
    });
  } catch (error) {
    console.error('Screenshot upload error:', error);
    return NextResponse.json({ success: false, error: '上传失败' }, { status: 500 });
  }
}
