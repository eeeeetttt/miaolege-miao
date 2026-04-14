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

    const connection = await pool.getConnection();
    
    const results: string[] = [];
    
    // Add forum_enabled column to planets table
    try {
      await connection.execute('ALTER TABLE planets ADD COLUMN forum_enabled BOOLEAN DEFAULT FALSE');
      results.push('Added forum_enabled column to planets table');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        results.push('forum_enabled column already exists');
      } else {
        results.push(`Error adding forum_enabled: ${error.message}`);
      }
    }

    // Create forum_posts table
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS forum_posts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planet_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          like_count INT DEFAULT 0,
          comment_count INT DEFAULT 0,
          is_pinned BOOLEAN DEFAULT FALSE,
          status ENUM('active', 'hidden', 'deleted') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_forum_post_planet (planet_id),
          INDEX idx_forum_post_user (user_id),
          INDEX idx_forum_post_status (status)
        )
      `);
      results.push('Created forum_posts table');
    } catch (error: any) {
      results.push(`forum_posts table: ${error.message}`);
    }

    // Create forum_comments table
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS forum_comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          post_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          parent_id INT DEFAULT NULL,
          like_count INT DEFAULT 0,
          status ENUM('active', 'hidden', 'deleted') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_forum_comment_post (post_id),
          INDEX idx_forum_comment_user (user_id),
          INDEX idx_forum_comment_parent (parent_id)
        )
      `);
      results.push('Created forum_comments table');
    } catch (error: any) {
      results.push(`forum_comments table: ${error.message}`);
    }

    // Create forum_likes table
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS forum_likes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          target_type ENUM('post', 'comment') NOT NULL,
          target_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uk_forum_like_user_target (user_id, target_type, target_id),
          INDEX idx_forum_like_target (target_type, target_id)
        )
      `);
      results.push('Created forum_likes table');
    } catch (error: any) {
      results.push(`forum_likes table: ${error.message}`);
    }

    // Create forum_bans table
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS forum_bans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planet_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          banned_by VARCHAR(255) NOT NULL,
          reason VARCHAR(500) DEFAULT NULL,
          expires_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uk_forum_ban_planet_user (planet_id, user_id),
          INDEX idx_forum_ban_planet (planet_id)
        )
      `);
      results.push('Created forum_bans table');
    } catch (error: any) {
      results.push(`forum_bans table: ${error.message}`);
    }

    connection.release();
    
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
