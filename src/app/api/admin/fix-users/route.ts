import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 检查是否是管理员
    const db = require('@/lib/db');
    const [rows] = await db.execute({
      sql: 'SELECT role FROM user_accounts WHERE user_id = ?',
      args: [session.user.id]
    });

    if (!Array.isArray(rows) || rows.length === 0 || rows[0].role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    // 该功能已停用 - 用户数据已完全迁移到 MySQL
    return NextResponse.json({
      success: true,
      message: '用户同步功能已停用，所有用户数据已迁移到 MySQL',
      stats: {
        total: 0,
        synced: 0,
        skipped: 0,
      }
    });
  } catch (error: any) {
    console.error('错误:', error);
    return NextResponse.json({ error: '操作失败', details: error.message }, { status: 500 });
  }
}
