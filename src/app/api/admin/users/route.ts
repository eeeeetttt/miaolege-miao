import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { users, mtAccounts, followRecords, planets } from '@/lib/schema';
import { eq, desc, sql, and, isNotNull } from 'drizzle-orm';

/**
 * 获取用户列表
 */
export async function GET(request: NextRequest) {
  try {
    const { isAdmin: admin } = await isAdmin();
    
    if (!admin) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || ''; // user, admin, or '' for all

    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereConditions = [];
    if (search) {
      whereConditions.push(
        sql`(${users.name} LIKE ${`%${search}%`} OR ${users.email} LIKE ${`%${search}%`} OR ${users.userId} LIKE ${`%${search}%`})`
      );
    }
    if (role) {
      whereConditions.push(eq(users.role, role as 'user' | 'admin'));
    }

    // 查询用户列表
    const userList = await db
      .select({
        userId: users.userId,
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        coinBalance: users.coinBalance,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取总数
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // 获取每个用户的附加信息
    const usersWithInfo = await Promise.all(
      userList.map(async (user) => {
        // MT账号
        const mtAccountData = await db
          .select({ accountNumber: mtAccounts.accountNumber, platform: mtAccounts.platform })
          .from(mtAccounts)
          .where(eq(mtAccounts.userId, user.userId))
          .limit(1);

        // 活跃跟单数
        const [followCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(followRecords)
          .where(and(
            eq(followRecords.userId, user.userId),
            eq(followRecords.status, 'active')
          ));

        // 创建的星球数
        const [planetCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(planets)
          .where(eq(planets.creatorId, user.userId));

        return {
          ...user,
          mtAccount: mtAccountData[0] || null,
          activeFollows: followCount.count,
          createdPlanets: planetCount.count,
        };
      })
    );

    return NextResponse.json({
      users: usersWithInfo,
      total: countResult.count,
      page,
      totalPages: Math.ceil(countResult.count / limit),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}

/**
 * 更新用户信息（余额、角色等）
 */
export async function PATCH(request: NextRequest) {
  try {
    const { isAdmin: admin } = await isAdmin();
    
    if (!admin) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, coinBalance, role } = body;

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    
    if (typeof coinBalance === 'number') {
      updateData.coinBalance = coinBalance;
    }
    
    if (role === 'user' || role === 'admin') {
      updateData.role = role;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '没有要更新的内容' }, { status: 400 });
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.userId, userId));

    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
  }
}
