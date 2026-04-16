import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// 单独添加 name_updated_at 字段
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password !== 'admin123') {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    // 方法1: 使用 ALIAS
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN name_updated_at TIMESTAMP NULL DEFAULT NULL`);
      return NextResponse.json({ success: true, message: '✅ name_updated_at 字段添加成功' });
    } catch (e: any) {
      // 如果失败，尝试其他语法
      console.log('方法1失败:', e.message);
    }

    // 方法2: 不带 DEFAULT
    try {
      await db.execute(sql`ALTER TABLE users ADD name_updated_at TIMESTAMP`);
      return NextResponse.json({ success: true, message: '✅ name_updated_at 字段添加成功 (方法2)' });
    } catch (e: any) {
      console.log('方法2失败:', e.message);
    }

    // 检查字段是否已存在
    try {
      const result = await db.execute(sql`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'name_updated_at'
      `);
      if (result.length > 0) {
        return NextResponse.json({ success: true, message: '⚠️ name_updated_at 字段已存在' });
      }
    } catch (e: any) {
      console.log('检查失败:', e.message);
    }

    return NextResponse.json({ 
      error: '添加字段失败，请手动在数据库执行:',
      sql: 'ALTER TABLE users ADD COLUMN name_updated_at TIMESTAMP NULL;'
    }, { status: 500 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
