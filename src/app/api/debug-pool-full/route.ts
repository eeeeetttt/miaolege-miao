import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    // 检查 pool 连接到的数据库
    const [dbResult] = await pool.query('SELECT DATABASE() as db');
    
    // 检查数据库中有哪些表
    const [tables] = await pool.query('SHOW TABLES');
    
    // 检查 users 表的结构
    let usersColumns = null;
    try {
      const [cols] = await pool.query('DESCRIBE users');
      usersColumns = cols;
    } catch (e: any) {
      usersColumns = 'users 表不存在或无法访问: ' + e.message;
    }
    
    return NextResponse.json({ 
      database: dbResult,
      tables: tables,
      users_columns: usersColumns
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
