import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

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
      host: 'Supabase PostgreSQL',
      database_url_set: !!process.env.DATABASE_URL,
      supabase_url_set: !!process.env.COZE_SUPABASE_URL,
      service_role_key_set: !!process.env.COZE_SUPABASE_SERVICE_ROLE_KEY,
    },
    tests: []
  };

  // 测试1: 基本连接
  try {
    const startTime = Date.now();
    const connectionString = process.env.DATABASE_URL || '';
    const sql = postgres(connectionString, {
      connect_timeout: 10,
    });
    const connectTime = Date.now() - startTime;
    
    results.tests.push({
      name: '基本连接',
      status: 'success',
      connectTime: `${connectTime}ms`,
    });

    // 测试2: 查询版本
    try {
      const versionResult = await sql`SELECT version()`;
      results.tests.push({
        name: '查询版本',
        status: 'success',
        data: versionResult[0]?.version,
      });
    } catch (e: any) {
      results.tests.push({
        name: '查询版本',
        status: 'failed',
        error: e.message,
      });
    }

    // 测试3: 查询表列表
    try {
      const tablesResult = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `;
      results.tests.push({
        name: '查询表列表',
        status: 'success',
        tables: tablesResult,
      });
    } catch (e: any) {
      results.tests.push({
        name: '查询表列表',
        status: 'failed',
        error: e.message,
      });
    }

    // 测试4: 查询用户数量
    try {
      const countResult = await sql`SELECT COUNT(*) as count FROM users`;
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

    // 测试5: 查询聊天消息数量
    try {
      const chatResult = await sql`SELECT COUNT(*) as count FROM chat_hall_messages`;
      results.tests.push({
        name: '查询聊天消息数量',
        status: 'success',
        data: chatResult,
      });
    } catch (e: any) {
      results.tests.push({
        name: '查询聊天消息数量',
        status: 'failed',
        error: e.message,
      });
    }

    await sql.end();
  } catch (e: any) {
    results.tests.push({
      name: '基本连接',
      status: 'failed',
      error: e.message || String(e),
    });
  }

  // 测试6: Supabase 客户端连接
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();
    
    if (!supabase) {
      results.tests.push({
        name: 'Supabase 客户端连接',
        status: 'failed',
        error: 'Supabase 客户端不可用',
      });
    } else {
      const { data, error } = await supabase.from('users').select('count');
      
      if (error) {
        results.tests.push({
          name: 'Supabase 客户端连接',
          status: 'failed',
          error: error.message,
        });
      } else {
        results.tests.push({
          name: 'Supabase 客户端连接',
          status: 'success',
          count: data,
        });
      }
    }
  } catch (e: any) {
    results.tests.push({
      name: 'Supabase 客户端连接',
      status: 'failed',
      error: e.message || String(e),
    });
  }

  return NextResponse.json(results);
}
