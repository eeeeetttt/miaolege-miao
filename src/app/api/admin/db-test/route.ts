import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// 数据库连接诊断
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('password');

  if (password !== 'admin123') {
    return NextResponse.json({ error: '密码错误' }, { status: 403 });
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    config: {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      database: process.env.MYSQL_DATABASE,
      password_set: !!process.env.MYSQL_PASSWORD,
    },
    tests: []
  };

  // 测试1: 基本连接
  try {
    const startTime = Date.now();
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      connectTimeout: 10000,
    });
    const connectTime = Date.now() - startTime;
    
    results.tests.push({
      name: '基本连接',
      status: 'success',
      connectTime: `${connectTime}ms`,
    });

    // 测试2: 选择数据库
    try {
      await connection.changeUser({ database: process.env.MYSQL_DATABASE });
      results.tests.push({
        name: '选择数据库',
        status: 'success',
      });

      // 测试3: 查询版本
      const [versionRows] = await connection.execute('SELECT VERSION() as version');
      results.tests.push({
        name: '查询版本',
        status: 'success',
        data: versionRows,
      });

      // 测试4: 查询用户表
      try {
        const [tables] = await connection.execute('SHOW TABLES');
        results.tests.push({
          name: '查询表列表',
          status: 'success',
          tables: tables,
        });
      } catch (e: any) {
        results.tests.push({
          name: '查询表列表',
          status: 'failed',
          error: e.message,
        });
      }

      // 测试5: 查询用户数量
      try {
        const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM users');
        results.tests.push({
          name: '查询用户数量',
          status: 'success',
          data: countResult,
        });
      } catch (e: any) {
        results.tests.push({
          name: '查询用户数量',
          status: 'failed',
          error: e.message,
        });
      }

    } catch (e: any) {
      results.tests.push({
        name: '选择数据库',
        status: 'failed',
        error: e.message,
        code: e.code,
      });
    }

    await connection.end();
  } catch (e: any) {
    results.tests.push({
      name: '基本连接',
      status: 'failed',
      error: e.message,
      code: e.code,
      errno: e.errno,
      sqlState: e.sqlState,
    });
  }

  // 测试6: SSL连接
  try {
    const sslConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: { rejectUnauthorized: false },
      connectTimeout: 10000,
    });
    
    results.tests.push({
      name: 'SSL连接',
      status: 'success',
    });
    await sslConnection.end();
  } catch (e: any) {
    results.tests.push({
      name: 'SSL连接',
      status: 'failed',
      error: e.message,
      code: e.code,
    });
  }

  return NextResponse.json(results, { indent: 2 });
}
