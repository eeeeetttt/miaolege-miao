import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * 紧急修复：添加缺失的 expire_at 列
 */
export async function GET() {
  try {
    // 1. 添加 expire_at 列
    try {
      await db.execute(sql`ALTER TABLE planets ADD COLUMN expire_at TIMESTAMP NULL`);
      console.log('Added expire_at column');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('expire_at column already exists');
      } else {
        console.error('Error adding expire_at:', error);
      }
    }

    // 2. 添加 duration_days 列
    try {
      await db.execute(sql`ALTER TABLE planets ADD COLUMN duration_days INT DEFAULT 365`);
      console.log('Added duration_days column');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('duration_days column already exists');
      } else {
        console.error('Error adding duration_days:', error);
      }
    }

    // 3. 添加 owner_as_publisher 列
    try {
      await db.execute(sql`ALTER TABLE planets ADD COLUMN owner_as_publisher BOOLEAN DEFAULT FALSE`);
      console.log('Added owner_as_publisher column');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('owner_as_publisher column already exists');
      } else {
        console.error('Error adding owner_as_publisher:', error);
      }
    }

    // 4. 验证表结构
    const result = await db.execute(sql`DESCRIBE planets`);
    
    return NextResponse.json({
      success: true,
      message: '迁移完成'
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}
