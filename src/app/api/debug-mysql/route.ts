import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      connectTimeout: 10000,
    });

    // 测试不同的查询方式
    const results: Record<string, unknown> = {};

    // 方式1: execute 方法
    try {
      const [rows1] = await connection.execute('SELECT VERSION() as version');
      results.execute_version = rows1;
    } catch (e: unknown) {
      results.execute_version_error = e instanceof Error ? e.message : String(e);
    }

    // 方式2: query 方法
    try {
      const [rows2] = await connection.query('SELECT VERSION() as version');
      results.query_version = rows2;
    } catch (e: unknown) {
      results.query_version_error = e instanceof Error ? e.message : String(e);
    }

    // 方式3: execute 方法带参数
    try {
      const [rows3] = await connection.execute('SELECT * FROM users LIMIT 1');
      results.execute_users = rows3;
    } catch (e: unknown) {
      results.execute_users_error = e instanceof Error ? e.message : String(e);
    }

    // 方式4: query 方法带参数
    try {
      const [rows4] = await connection.query('SELECT * FROM users LIMIT 1');
      results.query_users = rows4;
    } catch (e: unknown) {
      results.query_users_error = e instanceof Error ? e.message : String(e);
    }

    // 方式5: query 方法带 ? 参数
    try {
      const [rows5] = await connection.query('SELECT * FROM users WHERE email = ? LIMIT 1', ['test@test.com']);
      results.query_users_with_param = rows5;
    } catch (e: unknown) {
      results.query_users_with_param_error = e instanceof Error ? e.message : String(e);
    }

    await connection.end();
    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    console.error('测试错误:', error);
    const message = error instanceof Error ? error.message : '失败';
    return NextResponse.json({ success: false, error: message });
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}
