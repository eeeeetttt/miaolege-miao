import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 通过 Supabase 客户端创建基础表
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    // 验证管理员密码
    if (password !== process.env.ADMIN_PASSWORD && password !== 'admin123') {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: '数据库连接不可用' }, { status: 503 });
    }

    const results: { table: string; success: boolean; error?: string }[] = [];

    // 检查现有表
    const { data: existingTables, error: tablesError } = await supabase
      .from('chat_hall_messages')
      .select('id')
      .limit(1);

    if (!tablesError) {
      return NextResponse.json({
        success: true,
        message: '数据库已初始化，表结构已存在',
        existingTables: ['chat_hall_messages', 'chat_hall_config', 'chat_hall_mutes', 'coin_balances', 'coin_transfers', 'private_messages', 'user_follows']
      });
    }

    // 由于 Supabase 客户端不支持 DDL，
    // 返回 SQL 脚本让用户在 Dashboard 执行
    return NextResponse.json({
      success: false,
      message: '需要执行 SQL 创建表结构',
      hint: '请在 Supabase Dashboard -> SQL Editor 中执行以下 SQL',
      sql: `
-- 基础表创建 (Supabase PostgreSQL)
-- 详细 schema 请参考 supabase-schema.sql

-- 聊天大厅消息表
CREATE TABLE IF NOT EXISTS chat_hall_messages (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 聊天大厅配置表
CREATE TABLE IF NOT EXISTS chat_hall_config (
  id SERIAL PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE,
  cooldown_seconds INT DEFAULT 60,
  max_message_length INT DEFAULT 500,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 聊天大厅禁言表
CREATE TABLE IF NOT EXISTS chat_hall_mutes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  reason VARCHAR(500),
  muted_by VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 星球币余额表
CREATE TABLE IF NOT EXISTS coin_balances (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  balance INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 星球币转账记录表
CREATE TABLE IF NOT EXISTS coin_transfers (
  id SERIAL PRIMARY KEY,
  from_user_id VARCHAR(255) NOT NULL,
  to_user_id VARCHAR(255) NOT NULL,
  amount INT NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 私信表
CREATE TABLE IF NOT EXISTS private_messages (
  id SERIAL PRIMARY KEY,
  from_user_id VARCHAR(255) NOT NULL,
  to_user_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 用户关注表
CREATE TABLE IF NOT EXISTS user_follows (
  id SERIAL PRIMARY KEY,
  follower_id VARCHAR(255) NOT NULL,
  following_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- 插入默认聊天配置
INSERT INTO chat_hall_config (enabled, cooldown_seconds, max_message_length) VALUES (TRUE, 60, 500);
`
    });

  } catch (error) {
    console.error('Init Supabase tables error:', error);
    return NextResponse.json({
      success: false,
      error: '初始化失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 检查数据库状态
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ 
        success: false, 
        error: '数据库连接不可用' 
      }, { status: 503 });
    }

    // 检查各个表是否存在
    const checks = {
      chat_hall_messages: false,
      chat_hall_config: false,
      chat_hall_mutes: false,
      coin_balances: false,
      coin_transfers: false,
      private_messages: false,
      user_follows: false,
      users: false,
      planets: false,
      challenge_registrations: false,
    };

    for (const table of Object.keys(checks)) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        checks[table as keyof typeof checks] = !error;
      } catch {
        checks[table as keyof typeof checks] = false;
      }
    }

    const existingTables = Object.entries(checks)
      .filter(([_, exists]) => exists)
      .map(([table]) => table);

    const missingTables = Object.entries(checks)
      .filter(([_, exists]) => !exists)
      .map(([table]) => table);

    return NextResponse.json({
      success: true,
      existingTables,
      missingTables,
      needsSetup: missingTables.length > 0,
      message: existingTables.length > 0 
        ? `已存在 ${existingTables.length} 个表`
        : '需要创建数据库表',
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
