import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * 初始化管理员
 * 通过管理员密码验证后将当前用户设置为管理员
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    // 管理员密码（应从环境变量获取）
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

    if (password !== adminPassword) {
      return NextResponse.json({ error: '管理员密码错误' }, { status: 403 });
    }

    // 将当前用户设置为管理员
    await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.userId, session.user.id));

    return NextResponse.json({ 
      success: true, 
      message: '已成功设置为管理员' 
    });
  } catch (error) {
    console.error('Init admin error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

/**
 * 检查当前用户是否为管理员
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false });
    }

    const [userData] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, session.user.id))
      .limit(1);

    if (!userData) {
      return NextResponse.json({ isAdmin: false });
    }

    const isAdmin = userData.role === 'admin';
    
    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Check admin error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
