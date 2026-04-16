import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// 执行数据库迁移 - 增加 avatar 字段长度
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password !== 'admin123') {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    const results: string[] = [];

    // 修改 avatar 字段为 TEXT 类型以支持 base64 图片
    try {
      await db.execute(sql`ALTER TABLE users MODIFY COLUMN avatar TEXT`);
      results.push('✅ avatar 字段类型修改为 TEXT 成功');
    } catch (e: any) {
      if (e.message?.includes('Unknown column')) {
        // 字段不存在，添加它
        try {
          await db.execute(sql`ALTER TABLE users ADD COLUMN avatar TEXT`);
          results.push('✅ avatar 字段添加成功');
        } catch (e2: any) {
          results.push(`❌ avatar 字段添加失败: ${e2.message}`);
        }
      } else {
        results.push(`⚠️ avatar 字段修改: ${e.message}`);
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
