import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

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

    // 使用 MySQL 更新用户角色
    await query(
      'UPDATE users SET role = ? WHERE user_id = ?',
      ['admin', session.user.id]
    );

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

    // 使用 MySQL 查询用户角色
    const users = await query(
      'SELECT role FROM users WHERE user_id = ?',
      [session.user.id]
    );

    if (!users || users.length === 0) {
      return NextResponse.json({ isAdmin: false });
    }

    const isAdmin = users[0].role === 'admin';
    
    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error('Check admin error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}
