import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    // Verify admin password
    if (password !== process.env.ADMIN_PASSWORD && password !== 'admin123') {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    // Create tables using Drizzle migrations
    // Note: For production, use `pnpm drizzle-kit push:pg` to create tables
    // This endpoint provides a simple table existence check
    
    const tablesCheck = await pool`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    const existingTables = tablesCheck.map((t: any) => t.table_name);

    const requiredTables = [
      'users', 'planets', 'planet_members', 'planet_applications', 
      'planet_earnings', 'signals', 'accounts', 'sessions', 
      'verification_tokens', 'mt_accounts', 'follow_records',
      'coin_recharges', 'ea_products', 'ea_purchases',
      'documents', 'system_config', 'forum_posts', 'forum_comments',
      'forum_likes', 'forum_bans', 'challenge_registrations',
      'challenge_config', 'challenge_level_config',
      'challenge_hall_of_fame', 'challenge_level_records'
    ];

    const missingTables = requiredTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      return NextResponse.json({
        success: false,
        message: `缺少以下表: ${missingTables.join(', ')}`,
        existingTables,
        missingTables,
        hint: '请运行 `pnpm drizzle-kit push:pg` 创建表结构'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: '所有必需的表已存在',
      tableCount: existingTables.length,
      tables: existingTables
    });

  } catch (error) {
    console.error('Init DB error:', error);
    return NextResponse.json({
      success: false,
      error: '初始化失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
