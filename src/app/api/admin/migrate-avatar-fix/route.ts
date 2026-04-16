import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// 强制修改 avatar 字段类型
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password !== 'admin123') {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    const results: string[] = [];

    // 方法1: 使用 CHANGE COLUMN 语法
    try {
      await db.execute(sql`
        ALTER TABLE users 
        CHANGE COLUMN avatar avatar MEDIUMTEXT
      `);
      results.push('✅ avatar 字段类型修改为 MEDIUMTEXT 成功');
    } catch (e: any) {
      results.push(`⚠️ 方法1失败: ${e.message?.substring(0, 100)}`);
      
      // 方法2: 尝试直接更新为 TEXT
      try {
        await db.execute(sql`
          ALTER TABLE users MODIFY avatar MEDIUMTEXT
        `);
        results.push('✅ 方法2成功: avatar 修改为 MEDIUMTEXT');
      } catch (e2: any) {
        results.push(`⚠️ 方法2失败: ${e2.message?.substring(0, 100)}`);
      }
    }

    // 检查当前字段类型
    try {
      const columns = await db.execute(sql`
        SELECT COLUMN_NAME, COLUMN_TYPE, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar'
      `);
      if (columns.length > 0) {
        results.push(`📊 当前 avatar 字段类型: ${(columns as any)[0].COLUMN_TYPE}`);
      }
    } catch (e: any) {
      results.push(`⚠️ 检查字段类型失败: ${e.message?.substring(0, 100)}`);
    }

    return NextResponse.json({
      success: true,
      results,
      message: '迁移完成'
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: '迁移失败',
      details: error.message
    }, { status: 500 });
  }
}
