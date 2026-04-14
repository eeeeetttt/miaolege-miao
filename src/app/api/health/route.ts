import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  const diagnostics: {
    status: string;
    timestamp: string;
    database: {
      configured: boolean;
      connected: boolean;
      host?: string;
      port?: string;
      database?: string;
      error?: string;
    };
    env: {
      MYSQL_HOST: boolean;
      MYSQL_USER: boolean;
      MYSQL_PASSWORD: boolean;
      MYSQL_DATABASE: boolean;
    };
  } = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    database: {
      configured: false,
      connected: false,
    },
    env: {
      MYSQL_HOST: !!process.env.MYSQL_HOST,
      MYSQL_USER: !!process.env.MYSQL_USER,
      MYSQL_PASSWORD: !!process.env.MYSQL_PASSWORD,
      MYSQL_DATABASE: !!process.env.MYSQL_DATABASE,
    },
  };

  // 检查数据库配置
  const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || '3306',
    database: process.env.MYSQL_DATABASE || 'trade',
  };

  diagnostics.database.configured = !!(
    process.env.MYSQL_HOST &&
    process.env.MYSQL_USER &&
    process.env.MYSQL_PASSWORD &&
    process.env.MYSQL_DATABASE
  );

  diagnostics.database.host = dbConfig.host;
  diagnostics.database.port = dbConfig.port;
  diagnostics.database.database = dbConfig.database;

  // 测试数据库连接
  try {
    const connection = await pool.getConnection();
    
    // 执行简单查询
    await connection.execute('SELECT 1');
    
    // 检查 users 表是否存在
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'users'"
    );
    
    connection.release();
    
    diagnostics.database.connected = true;
    diagnostics.status = 'ok';
    
    if (Array.isArray(tables) && tables.length === 0) {
      diagnostics.status = 'warning';
      return NextResponse.json({
        ...diagnostics,
        message: '数据库连接成功，但数据表未创建。请访问 /api/admin/init-db 初始化数据库',
      });
    }
    
  } catch (error) {
    diagnostics.database.connected = false;
    diagnostics.status = 'error';
    diagnostics.database.error = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      ...diagnostics,
      message: '数据库连接失败，请检查环境变量配置',
      solution: '请确保已配置以下环境变量：MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE',
    }, { status: 500 });
  }

  return NextResponse.json(diagnostics);
}
