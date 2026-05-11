import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.COZE_SUPABASE_URL!,
  process.env.COZE_SUPABASE_SERVICE_ROLE_KEY!
);

// MySQL 连接
let pool: any = null;
async function getMySQLPool() {
  if (pool) return pool;
  const mysql = await import('mysql2/promise');
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });
  return pool;
}

export async function POST(request: Request) {
  try {
    const pool = await getMySQLPool();
    
    // 获取所有用户
    const { data: users, error } = await supabase
      .from('users')
      .select('user_id, email, name, password, role, coin_balance, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: '获取用户失败', details: error.message }, { status: 500 });
    }

    let synced = 0;
    let skipped = 0;

    for (const user of users || []) {
      // 检查 MySQL 是否已有记录
      const [rows] = await pool.execute(
        'SELECT user_id FROM user_accounts WHERE user_id = ?',
        [user.user_id]
      );

      if ((rows as any[]).length > 0) {
        skipped++;
        continue;
      }

      // 插入 MySQL
      try {
        await pool.execute(
          `INSERT INTO user_accounts (user_id, email, password_hash, name, role, gold_balance, coin_balance, total_debt)
           VALUES (?, ?, ?, ?, ?, 0, ?, '0.00')`,
          [user.user_id, user.email, user.password || '', user.name, user.role || 'user', user.coin_balance || 100]
        );
        synced++;
        console.log(`[同步] 已同步用户: ${user.email} (${user.user_id})`);
      } catch (mysqlError: any) {
        console.error(`[同步] 同步用户失败: ${user.email}`, mysqlError.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `同步完成`,
      stats: {
        total: users?.length || 0,
        synced,
        skipped,
      },
      users: users?.slice(0, 5).map(u => ({
        user_id: u.user_id,
        email: u.email,
        name: u.name,
      })),
    });
  } catch (error: any) {
    console.error('同步错误:', error);
    return NextResponse.json({ error: '同步失败', details: error.message }, { status: 500 });
  }
}
