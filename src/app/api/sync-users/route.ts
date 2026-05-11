import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

// 同步用户数据 - 从 Supabase users 表同步到 MySQL user_accounts 表
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const email = session.user.email;
    
    // 获取用户信息
    const [userRows] = await pool.query(
      'SELECT user_id, email, name FROM user_accounts WHERE email = ? LIMIT 1',
      [email]
    ) as [any[], any];
    
    const user = userRows[0];
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '用户已同步',
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error: any) {
    console.error('[同步] 同步用户失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
