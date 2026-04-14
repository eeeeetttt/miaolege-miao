import { NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET() {
  const diagnostics: {
    timestamp: string;
    environment: {
      NODE_ENV: string;
      DATABASE_URL: { set: boolean; host: string; hasPassword: boolean };
      NEXTAUTH_URL: { set: boolean; value: string };
      NEXTAUTH_SECRET: { set: boolean };
      SUPABASE_URL: { set: boolean };
      SUPABASE_SERVICE_ROLE_KEY: { set: boolean };
    };
    connection: {
      success: boolean;
      error?: string;
      serverVersion?: string;
    };
    suggestions: string[];
  } = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      DATABASE_URL: { set: false, host: '', hasPassword: false },
      NEXTAUTH_URL: { set: false, value: '' },
      NEXTAUTH_SECRET: { set: false },
      SUPABASE_URL: { set: false },
      SUPABASE_SERVICE_ROLE_KEY: { set: false },
    },
    connection: {
      success: false,
    },
    suggestions: [],
  };

  // 检查环境变量（隐藏敏感信息）
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      diagnostics.environment.DATABASE_URL = {
        set: true,
        host: url.host,
        hasPassword: !!url.password,
      };
    } catch {
      diagnostics.environment.DATABASE_URL = {
        set: true,
        host: '无法解析',
        hasPassword: false,
      };
    }
  }
  
  diagnostics.environment.SUPABASE_URL = {
    set: !!process.env.COZE_SUPABASE_URL,
  };
  diagnostics.environment.SUPABASE_SERVICE_ROLE_KEY = {
    set: !!process.env.COZE_SUPABASE_SERVICE_ROLE_KEY,
  };
  diagnostics.environment.NEXTAUTH_URL = {
    set: !!process.env.NEXTAUTH_URL,
    value: process.env.NEXTAUTH_URL || '',
  };
  diagnostics.environment.NEXTAUTH_SECRET = {
    set: !!process.env.NEXTAUTH_SECRET,
  };

  // 尝试直接连接
  try {
    const connectionString = process.env.DATABASE_URL || '';
    const sql = postgres(connectionString, {
      connect_timeout: 10,
    });

    // 获取服务器版本
    const result = await sql`SELECT version() as version`;
    
    diagnostics.connection.success = true;
    diagnostics.connection.serverVersion = result[0]?.version;

    await sql.end();

  } catch (error: any) {
    diagnostics.connection.success = false;
    diagnostics.connection.error = error.message || String(error);

    // 根据错误类型提供解决方案
    if (error.message?.includes('ECONNREFUSED')) {
      diagnostics.suggestions.push('连接被拒绝，请检查：');
      diagnostics.suggestions.push('1. Supabase PostgreSQL 服务器地址是否正确');
      diagnostics.suggestions.push('2. Supabase 数据库是否已启动');
      diagnostics.suggestions.push('3. 防火墙/网络规则是否允许访问');
    } else if (error.message?.includes('authentication failed')) {
      diagnostics.suggestions.push('认证失败，请检查：');
      diagnostics.suggestions.push('1. 数据库用户名是否正确');
      diagnostics.suggestions.push('2. 数据库密码是否正确');
      diagnostics.suggestions.push('3. 用户是否有访问该数据库的权限');
    } else if (error.message?.includes('does not exist')) {
      diagnostics.suggestions.push('数据库不存在，请检查：');
      diagnostics.suggestions.push('1. 数据库名称是否正确');
      diagnostics.suggestions.push('2. 是否已创建该数据库');
    } else {
      diagnostics.suggestions.push(`连接错误: ${error.message}`);
    }
  }

  // 检查环境变量完整性
  if (!diagnostics.environment.DATABASE_URL.set) {
    diagnostics.suggestions.push('DATABASE_URL 环境变量未设置（Supabase PostgreSQL 连接字符串）');
  }
  if (!diagnostics.environment.SUPABASE_URL.set) {
    diagnostics.suggestions.push('COZE_SUPABASE_URL 环境变量未设置');
  }
  if (!diagnostics.environment.SUPABASE_SERVICE_ROLE_KEY.set) {
    diagnostics.suggestions.push('COZE_SUPABASE_SERVICE_ROLE_KEY 环境变量未设置');
  }
  if (!diagnostics.environment.NEXTAUTH_URL.set) {
    diagnostics.suggestions.push('NEXTAUTH_URL 环境变量未设置，可能导致登录回调失败');
  }
  if (!diagnostics.environment.NEXTAUTH_SECRET.set) {
    diagnostics.suggestions.push('NEXTAUTH_SECRET 环境变量未设置，可能导致登录失败');
  }

  return NextResponse.json(diagnostics, { 
    status: diagnostics.connection.success ? 200 : 500 
  });
}
