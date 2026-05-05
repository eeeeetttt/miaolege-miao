import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// 更新用户昵称
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '昵称不能为空' }, { status: 400 });
    }

    if (name.length > 20) {
      return NextResponse.json({ error: '昵称不能超过20个字符' }, { status: 400 });
    }

    // 获取用户信息，检查上次修改时间
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.userId, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查是否一年内修改过
    if (user.updatedAt) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (new Date(user.updatedAt) > oneYearAgo) {
        const nextUpdateDate = new Date(user.updatedAt);
        nextUpdateDate.setFullYear(nextUpdateDate.getFullYear() + 1);
        return NextResponse.json({ 
          error: `一年只能修改一次昵称，下次可修改时间：${nextUpdateDate.toLocaleDateString()}` 
        }, { status: 400 });
      }
    }

    // 更新昵称
    await db
      .update(users)
      .set({ 
        name: name.trim(), 
        updatedAt: new Date()
      })
      .where(eq(users.userId, session.user.id));

    return NextResponse.json({ success: true, name: name.trim() });
  } catch (error) {
    console.error('Update name error:', error);
    return NextResponse.json({ error: '修改昵称失败' }, { status: 500 });
  }
}
