import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq, like, or, desc, sql } from 'drizzle-orm';

/**
 * 获取用户列表
 */
export async function GET(request: NextRequest) {
  try {
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    if (session.user.email !== '497209390@qq.com') {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const offset = (page - 1) * limit;

    // 构建查询
    let conditions = [];
    if (search) {
      conditions.push(or(
        like(users.name, `%${search}%`),
        like(users.email, `%${search}%`)
      ));
    }
    if (role) {
      conditions.push(eq(users.role, role as 'admin' | 'user' | 'vip'));
    }

    // 获取总数
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(conditions.length > 0 ? conditions[0] : undefined);
    const total = Number(countResult[0]?.count) || 0;

    // 获取用户列表
    const userList = await db.query.users.findMany({
      where: conditions.length > 0 ? conditions[0] : undefined,
      orderBy: [desc(users.createdAt)],
      limit,
      offset,
    });

    return NextResponse.json({
      users: userList.map(u => ({
        userId: u.userId,
        email: u.email,
        name: u.name,
        avatar: u.avatarUrl,
        coinBalance: u.coinBalance,
        role: u.role,
        createdAt: u.createdAt,
      })) || [],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: '获取用户列表失败', details: String(error) }, { status: 500 });
  }
}
