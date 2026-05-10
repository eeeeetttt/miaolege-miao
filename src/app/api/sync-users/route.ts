import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { pool } from '@/lib/db';

// 同步用户数据 - 从 Supabase users 表同步到 MySQL user_accounts 表
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const email = session.user.email;
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 500 });
    }

    // 从 Supabase 获取用户信息
    const { data: supabaseUser, error: userError } = await supabase
      .from('users')
      .select('user_id, email, name, avatar, coin_balance, role')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (userError || !supabaseUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查 MySQL 中是否已有记录
    const [existingRecords] = await pool.execute(
      `SELECT user_id FROM user_accounts WHERE email = ?`,
      [email]
    ) as any[];

    if (existingRecords && existingRecords.length > 0) {
      // 已存在，更新金币和昵称
      await pool.execute(
        `UPDATE user_accounts SET name = ?, coin_balance = ? WHERE email = ?`,
        [supabaseUser.name, supabaseUser.coin_balance || 0, email]
      );
      
      return NextResponse.json({
        success: true,
        message: '用户数据已同步更新',
        userId: existingRecords[0].user_id,
      });
    }

    // 不存在，创建新记录
    // 生成与 Supabase 一致的 user_id
    const userId = supabaseUser.user_id;
    const name = supabaseUser.name || email.split('@')[0];
    const coinBalance = supabaseUser.coin_balance || 100;
    
    await pool.execute(
      `INSERT INTO user_accounts (user_id, email, password_hash, name, role, gold_balance, coin_balance, total_debt)
       VALUES (?, ?, 'placeholder', ?, 'user', 0, ?, '0.00')`,
      [userId, email, name, coinBalance]
    );

    console.log('[同步] 用户数据同步成功:', email, userId);

    return NextResponse.json({
      success: true,
      message: '用户数据同步成功',
      userId: userId,
    });
  } catch (error: any) {
    console.error('同步用户数据错误:', error);
    return NextResponse.json({ error: error.message || '同步失败' }, { status: 500 });
  }
}

// 批量同步所有用户（管理员）
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查是否是管理员
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 500 });
    }

    // 获取所有 Supabase 用户
    const { data: supabaseUsers, error: usersError } = await supabase
      .from('users')
      .select('user_id, email, name, avatar, coin_balance, role');

    if (usersError) {
      return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const user of supabaseUsers || []) {
      try {
        const [existingRecords] = await pool.execute(
          `SELECT user_id FROM user_accounts WHERE email = ?`,
          [user.email]
        ) as any[];

        if (existingRecords && existingRecords.length > 0) {
          await pool.execute(
            `UPDATE user_accounts SET name = ?, coin_balance = ?, role = ? WHERE email = ?`,
            [user.name, user.coin_balance || 0, user.role || 'user', user.email]
          );
        } else {
          await pool.execute(
            `INSERT INTO user_accounts (user_id, email, password_hash, name, role, gold_balance, coin_balance, total_debt)
             VALUES (?, ?, 'placeholder', ?, ?, 0, ?, '0.00')`,
            [user.user_id, user.email, user.name, user.role || 'user', user.coin_balance || 0]
          );
        }
        synced++;
      } catch (err: any) {
        failed++;
        errors.push(`${user.email}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `同步完成`,
      summary: {
        total: supabaseUsers?.length || 0,
        synced,
        failed,
      },
      errors: failed > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('批量同步错误:', error);
    return NextResponse.json({ error: error.message || '同步失败' }, { status: 500 });
  }
}
