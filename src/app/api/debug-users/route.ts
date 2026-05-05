import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

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

    const [columns] = await connection.query('DESCRIBE users');
    const [sample] = await connection.query('SELECT * FROM users LIMIT 1');
    await connection.end();
    
    return NextResponse.json({ 
      columns: columns,
      sample: sample
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
