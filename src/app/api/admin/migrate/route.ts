import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// 给现有数据库添加 owner_as_publisher 字段
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    // 验证管理员密码
    if (password !== process.env.ADMIN_PASSWORD && password !== 'admin123') {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    const connection = await pool.getConnection();

    try {
      // 检查字段是否已存在
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'planets' AND COLUMN_NAME = 'owner_as_publisher'`
      );

      if (Array.isArray(columns) && columns.length === 0) {
        // 添加新字段
        await connection.execute(
          `ALTER TABLE planets ADD COLUMN owner_as_publisher BOOLEAN DEFAULT FALSE AFTER duration_days`
        );
        
        return NextResponse.json({ 
          success: true, 
          message: '已添加 owner_as_publisher 字段' 
        });
      } else {
        return NextResponse.json({ 
          success: true, 
          message: '字段已存在，无需添加' 
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: '迁移失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
