import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, userAccounts } from '@/lib/schema';
import { eq, like, or, desc, sql, inArray } from 'drizzle-orm';

interface UserWithBalance {
  userId: string;
  name: string | null;
  email: string | null;
  role: string | null;
  avatarUrl: string | null;
  createdAt: Date | null;
  coinBalance: string | number | null;
  goldBalance: string | number | null;
  totalDebt: string | number | null;
}

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
    const userListRaw = await db
      .select({
        userId: users.userId,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(conditions.length > 0 ? conditions[0] : undefined)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取所有用户的账户信息
    const userIds = userListRaw.map(u => u.userId);
    const accountInfos = userIds.length > 0 ? await db
      .select()
      .from(userAccounts)
      .where(inArray(userAccounts.userId, userIds)) : [];

    const accountMap = new Map(accountInfos.map(a => [a.userId, a]));

    const userList: UserWithBalance[] = userListRaw.map((u) => {
      const acc = accountMap.get(u.userId);
      return {
        userId: u.userId,
        name: u.name,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        coinBalance: acc?.coinBalance ?? '0',
        goldBalance: acc?.goldBalance ?? '0',
        totalDebt: acc?.totalDebt ?? '0',
      };
    });

    return NextResponse.json({
      users: userList.map(u => ({
        userId: u.userId || '',
        email: u.email || '',
        name: u.name || '',
        avatar: u.avatarUrl || '',
        goldBalance: Number(u.goldBalance || 0),
        coinBalance: Number(u.coinBalance || 0),
        silverBalance: Number(u.coinBalance || 0), // 银两使用 coinBalance 字段
        role: u.role || 'user',
        createdAt: u.createdAt || new Date(),
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

/**
 * 更新用户信息（管理员）
 */
export async function POST(request: NextRequest) {
  try {
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    if (session.user.email !== '497209390@qq.com') {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, name, avatarUrl, goldBalance, coinBalance, silverBalance, role } = body;

    if (!userId) {
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (goldBalance !== undefined) updateData.goldBalance = goldBalance;
    if (coinBalance !== undefined) updateData.coinBalance = coinBalance;
    if (role !== undefined) updateData.role = role;

    // 更新用户基础信息
    await db.update(users)
      .set(updateData)
      .where(eq(users.userId, userId));

    return NextResponse.json({ success: true, message: '用户信息已更新' });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: '更新用户失败', details: String(error) }, { status: 500 });
  }
}
