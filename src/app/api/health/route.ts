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
      error?: string;
    };
    env: {
      DATABASE_URL: boolean;
    };
  } = {
    status: 'checking',
    timestamp: new Date().toISOString(),
    database: {
      configured: false,
      connected: false,
    },
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
    },
  };

  // 检查数据库配置
  diagnostics.database.configured = !!process.env.DATABASE_URL;
  
  // 提取 host 信息用于显示
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      diagnostics.database.host = url.host;
    } catch {
      diagnostics.database.host = '无法解析';
    }
  }

  // 测试数据库连接
  try {
    // 执行简单查询
    await pool`SELECT 1`;
    
    // 检查 users 表是否存在
    const result = await pool`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`;
    
    diagnostics.database.connected = true;
    diagnostics.status = 'ok';
    
    if (result.length === 0) {
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
      solution: '请确保已配置 DATABASE_URL 环境变量（Supabase PostgreSQL 连接字符串）',
    }, { status: 500 });
  }

  return NextResponse.json(diagnostics);
}
