import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// 执行数据库迁移
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    // 简单密码验证
    if (password !== 'admin123') {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    const results: string[] = [];

    // 添加 avatar 字段到 users 表
    try {
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN avatar VARCHAR(500)
      `);
      results.push('✅ 添加 avatar 字段成功');
    } catch (e: any) {
      if (e.message?.includes('Duplicate column')) {
        results.push('⚠️ avatar 字段已存在，跳过');
      } else {
        results.push(`❌ 添加 avatar 字段失败: ${e.message}`);
      }
    }

    // 添加 nameUpdatedAt 字段到 users 表
    try {
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN name_updated_at TIMESTAMP
      `);
      results.push('✅ 添加 name_updated_at 字段成功');
    } catch (e: any) {
      if (e.message?.includes('Duplicate column')) {
        results.push('⚠️ name_updated_at 字段已存在，跳过');
      } else {
        results.push(`❌ 添加 name_updated_at 字段失败: ${e.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: '数据库迁移完成'
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: '迁移失败',
      details: error.message
    }, { status: 500 });
  }
}
