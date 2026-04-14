import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, pool } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, session.user.id))
      .limit(1);

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const results: string[] = [];
    
    // Check if forum_enabled column exists
    const columns = await pool`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'planets' 
        AND column_name = 'forum_enabled'
    `;

    if (columns.length === 0) {
      await pool`ALTER TABLE planets ADD COLUMN forum_enabled BOOLEAN DEFAULT FALSE`;
      results.push('Added forum_enabled column to planets table');
    } else {
      results.push('forum_enabled column already exists');
    }

    // Check existing tables
    const tables = await pool`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    const tableNames = tables.map((t: any) => t.table_name);
    
    results.push(`Forum tables status: ${JSON.stringify({
      forum_posts: tableNames.includes('forum_posts'),
      forum_comments: tableNames.includes('forum_comments'),
      forum_likes: tableNames.includes('forum_likes'),
      forum_bans: tableNames.includes('forum_bans'),
    })}`);

    return NextResponse.json({
      success: true,
      results,
      message: '论坛迁移检查完成，请使用 drizzle-kit 创建表结构'
    });

  } catch (error) {
    console.error('Forum migration error:', error);
    return NextResponse.json({ 
      error: '迁移失败', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
