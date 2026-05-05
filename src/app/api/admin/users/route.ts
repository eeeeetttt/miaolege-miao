import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';

/**
 * 获取用户列表
 */
export async function GET(request: NextRequest) {
  try {
    const { isAdmin: admin } = await isAdmin();
    
    if (!admin) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    // 使用动态导入避免构建时问题
    const { getSupabaseAdmin } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';

    const offset = (page - 1) * limit;

    // 从 Supabase 获取用户列表
    let query = supabase
      .from('users')
      .select('user_id, email, name, avatar, coin_balance, role, created_at', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,user_id.ilike.%${search}%`);
    }
    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
    }

    // 获取每个用户的附加信息（来自 MySQL）
    const { db } = await import('@/lib/db');
    const { mtAccounts, followRecords, planets } = await import('@/lib/schema');
    const { eq, sql, and } = await import('drizzle-orm');

    const usersWithInfo = await Promise.all(
      (users || []).map(async (user) => {
        // MT账号
        const mtAccountData = await db
          .select({ accountNumber: mtAccounts.accountNumber, platform: mtAccounts.platform })
          .from(mtAccounts)
          .where(eq(mtAccounts.userId, user.user_id))
          .limit(1);

        // 活跃跟单数
        const [followCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(followRecords)
          .where(and(
            eq(followRecords.userId, user.user_id),
            eq(followRecords.status, 'active')
          ));

        // 创建的星球数
        const [planetCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(planets)
          .where(eq(planets.creatorId, user.user_id));

        return {
          userId: user.user_id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          coinBalance: user.coin_balance,
          role: user.role,
          createdAt: user.created_at,
          mtAccount: mtAccountData[0] || null,
          activeFollows: followCount?.count || 0,
          createdPlanets: planetCount?.count || 0,
        };
      })
    );

    return NextResponse.json({
      users: usersWithInfo,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: '获取用户列表失败', details: String(error) }, { status: 500 });
  }
}
