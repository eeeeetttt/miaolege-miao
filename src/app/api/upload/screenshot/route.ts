import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    let imageData: string | null = null;
    let fileType: string = 'image/png';

    // 支持两种上传方式：FormData 和 JSON (base64)
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // JSON 方式 (base64)
      const body = await request.json();
      imageData = body.image;
      
      if (!imageData) {
        return NextResponse.json({ success: false, error: '未上传图片' }, { status: 400 });
      }
      
      // 验证 base64 格式
      if (!imageData.startsWith('data:image/')) {
        return NextResponse.json({ success: false, error: '请上传有效的图片文件' }, { status: 400 });
      }
      
      // 提取文件类型
      const match = imageData.match(/^data:(image\/\w+);base64,/);
      if (match) {
        fileType = match[1];
      }
      
      // 验证图片大小 (最大5MB，base64约 1.37倍)
      const base64Size = imageData.length * 0.75;
      if (base64Size > 5 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: '图片大小不能超过5MB' }, { status: 400 });
      }
    } else {
      // FormData 方式
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
      imageData = `data:${file.type};base64,${buffer.toString('base64')}`;
      fileType = file.type;
    }

    // 返回base64数据URL
    return NextResponse.json({
      success: true,
      url: imageData,
      message: '截图上传成功',
    });
  } catch (error) {
    console.error('Screenshot upload error:', error);
    return NextResponse.json({ success: false, error: '上传失败' }, { status: 500 });
  }
}
