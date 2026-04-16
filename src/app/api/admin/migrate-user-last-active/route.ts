import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { db } from '@/lib/db';

/**
 * 添加 last_active_at 字段到 users 表
 * 这个API仅执行一次，用于数据库结构更新
 */
export async function POST(request: NextRequest) {
  try {
    const { isAdmin: admin } = await isAdmin();
    
    if (!admin) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    // 检查字段是否已存在
    const checkResult = await db.execute(
      `SELECT COUNT(*) as count FROM information_schema.columns 
       WHERE table_schema = DATABASE() 
       AND table_name = 'users' 
       AND column_name = 'last_active_at'`
    );
    
    const result = checkResult as unknown as Array<{count: number}>;
    const count = result[0]?.count || 0;
    
    if (count === 0) {
      // 添加字段
      await db.execute(
        `ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP NULL AFTER updated_at`
      );
      return NextResponse.json({ 
        success: true, 
        message: 'last_active_at 字段已成功添加到 users 表' 
      });
    } else {
      return NextResponse.json({ 
        success: true, 
        message: 'last_active_at 字段已存在，无需添加' 
      });
    }
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: '迁移失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
