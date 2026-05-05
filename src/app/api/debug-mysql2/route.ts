import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// 加载环境变量
try {
  const { config } = await import('dotenv');
  config();
} catch {}

export async function GET() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'trade',
    });

    const [rows] = await connection.query('SELECT DATABASE() as db');
    await connection.end();
    
    return NextResponse.json({ database: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
