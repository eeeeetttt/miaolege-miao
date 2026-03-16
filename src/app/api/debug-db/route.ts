import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  const diagnostics: {
    timestamp: string;
    environment: {
      NODE_ENV: string;
      MYSQL_HOST: { set: boolean; value: string };
      MYSQL_PORT: { set: boolean; value: string };
      MYSQL_USER: { set: boolean; value: string };
      MYSQL_PASSWORD: { set: boolean; value: string; length: number };
      MYSQL_DATABASE: { set: boolean; value: string };
      NEXTAUTH_URL: { set: boolean; value: string };
      NEXTAUTH_SECRET: { set: boolean };
    };
    connection: {
      success: boolean;
      error?: string;
      errorCode?: string;
      errorSqlMessage?: string;
      serverVersion?: string;
      connectionId?: number;
    };
    suggestions: string[];
  } = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      MYSQL_HOST: { set: false, value: '' },
      MYSQL_PORT: { set: false, value: '' },
      MYSQL_USER: { set: false, value: '' },
      MYSQL_PASSWORD: { set: false, value: '', length: 0 },
      MYSQL_DATABASE: { set: false, value: '' },
      NEXTAUTH_URL: { set: false, value: '' },
      NEXTAUTH_SECRET: { set: false },
    },
    connection: {
      success: false,
    },
    suggestions: [],
  };

  // 检查环境变量（隐藏敏感信息）
  diagnostics.environment.MYSQL_HOST = {
    set: !!process.env.MYSQL_HOST,
    value: process.env.MYSQL_HOST ? `${process.env.MYSQL_HOST.substring(0, 10)}...` : '',
  };
  diagnostics.environment.MYSQL_PORT = {
    set: !!process.env.MYSQL_PORT,
    value: process.env.MYSQL_PORT || '未设置',
  };
  diagnostics.environment.MYSQL_USER = {
    set: !!process.env.MYSQL_USER,
    value: process.env.MYSQL_USER || '未设置',
  };
  diagnostics.environment.MYSQL_PASSWORD = {
    set: !!process.env.MYSQL_PASSWORD,
    value: '******',
    length: process.env.MYSQL_PASSWORD?.length || 0,
  };
  diagnostics.environment.MYSQL_DATABASE = {
    set: !!process.env.MYSQL_DATABASE,
    value: process.env.MYSQL_DATABASE || '未设置',
  };
  diagnostics.environment.NEXTAUTH_URL = {
    set: !!process.env.NEXTAUTH_URL,
    value: process.env.NEXTAUTH_URL || '未设置',
  };
  diagnostics.environment.NEXTAUTH_SECRET = {
    set: !!process.env.NEXTAUTH_SECRET,
  };

  // 尝试直接连接（不使用连接池）
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      connectTimeout: 10000,
    });

    // 获取服务器版本
    const [rows] = await connection.execute('SELECT VERSION() as version, CONNECTION_ID() as connId');
    const result = rows as { version: string; connId: number }[];
    
    diagnostics.connection.success = true;
    diagnostics.connection.serverVersion = result[0]?.version;
    diagnostics.connection.connectionId = result[0]?.connId;

    await connection.end();

  } catch (error: any) {
    diagnostics.connection.success = false;
    diagnostics.connection.error = error.message;
    diagnostics.connection.errorCode = error.code;
    diagnostics.connection.errorSqlMessage = error.sqlMessage;

    // 根据错误类型提供解决方案
    switch (error.code) {
      case 'ETIMEDOUT':
      case 'ECONNREFUSED':
        diagnostics.suggestions.push('网络连接超时或被拒绝，请检查：');
        diagnostics.suggestions.push('1. 数据库服务器地址和端口是否正确');
        diagnostics.suggestions.push('2. 腾讯云数据库安全组是否允许当前服务器IP访问');
        diagnostics.suggestions.push('3. 腾讯云数据库白名单是否已配置');
        diagnostics.suggestions.push('4. 数据库服务器是否已启动');
        break;
      case 'ER_ACCESS_DENIED_ERROR':
        diagnostics.suggestions.push('数据库访问被拒绝，请检查：');
        diagnostics.suggestions.push('1. 数据库用户名是否正确');
        diagnostics.suggestions.push('2. 数据库密码是否正确（注意密码中的特殊字符）');
        diagnostics.suggestions.push('3. 用户是否有访问该数据库的权限');
        break;
      case 'ER_BAD_DB_ERROR':
        diagnostics.suggestions.push('数据库不存在，请检查：');
        diagnostics.suggestions.push('1. 数据库名称是否正确');
        diagnostics.suggestions.push('2. 是否已创建该数据库');
        break;
      default:
        diagnostics.suggestions.push(`未知错误: ${error.message}`);
    }
  }

  // 检查环境变量完整性
  if (!diagnostics.environment.MYSQL_HOST.set) {
    diagnostics.suggestions.push('MYSQL_HOST 环境变量未设置');
  }
  if (!diagnostics.environment.MYSQL_PORT.set) {
    diagnostics.suggestions.push('MYSQL_PORT 环境变量未设置');
  }
  if (!diagnostics.environment.MYSQL_USER.set) {
    diagnostics.suggestions.push('MYSQL_USER 环境变量未设置');
  }
  if (!diagnostics.environment.MYSQL_PASSWORD.set) {
    diagnostics.suggestions.push('MYSQL_PASSWORD 环境变量未设置');
  }
  if (!diagnostics.environment.MYSQL_DATABASE.set) {
    diagnostics.suggestions.push('MYSQL_DATABASE 环境变量未设置');
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
