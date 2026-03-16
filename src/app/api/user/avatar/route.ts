import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 更新用户头像
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { avatar } = body;

    if (!avatar) {
      return NextResponse.json({ error: '头像不能为空' }, { status: 400 });
    }

    // 验证 avatar 是 base64 图片格式
    if (!avatar.startsWith('data:image/')) {
      return NextResponse.json({ error: '请上传有效的图片文件' }, { status: 400 });
    }

    // 检查图片大小（base64 编码后约为原文件的 1.37 倍）
    // 2MB 的图片 base64 后约 2.7MB
    const maxSize = 3 * 1024 * 1024; // 3MB for base64
    if (avatar.length > maxSize) {
      return NextResponse.json({ error: '图片大小不能超过 2MB' }, { status: 400 });
    }

    // 更新头像
    await db
      .update(users)
      .set({ 
        avatar: avatar, 
        updatedAt: new Date() 
      })
      .where(eq(users.userId, session.user.id));

    return NextResponse.json({ success: true, avatar });
  } catch (error) {
    console.error('Update avatar error:', error);
    return NextResponse.json({ 
      error: '更新头像失败', 
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}
