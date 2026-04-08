import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// 创建K线征途挑战赛相关表
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    // 仅允许管理员操作
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 创建挑战赛报名表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS challenge_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        status ENUM('active', 'completed', 'failed') DEFAULT 'active',
        current_level INT DEFAULT 1,
        completed_levels JSON,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        failed_at TIMESTAMP NULL,
        failed_level INT NULL,
        total_duration INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_challenge_user (user_id),
        INDEX idx_challenge_status (status),
        UNIQUE KEY uk_challenge_user_active (user_id, status),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建名人堂表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS challenge_hall_of_fame (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        registration_id INT NOT NULL,
        display_name VARCHAR(255) DEFAULT '匿名用户',
        is_anonymous BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP NOT NULL,
        total_duration INT NOT NULL,
        reward_claimed BOOLEAN DEFAULT FALSE,
        reward_claimed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_hall_user (user_id),
        INDEX idx_hall_completed_at (completed_at),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (registration_id) REFERENCES challenge_registrations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建关卡记录表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS challenge_level_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        registration_id INT NOT NULL,
        level INT NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        duration INT NULL,
        status ENUM('active', 'completed', 'failed') DEFAULT 'active',
        FOREIGN KEY (registration_id) REFERENCES challenge_registrations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'K线征途挑战赛数据表创建成功' 
    });
  } catch (error) {
    console.error('Create challenge tables error:', error);
    return NextResponse.json({ 
      error: '创建数据表失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// 获取数据库表列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查表是否存在
    const result = await db.execute(sql`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('challenge_registrations', 'challenge_hall_of_fame', 'challenge_level_records')
    `);

    const rows = (result as unknown as Array<{ TABLE_NAME: string }>) || [];
    const existingTables = rows.map(row => row.TABLE_NAME);

    return NextResponse.json({
      tables: {
        registrations: existingTables.includes('challenge_registrations'),
        hallOfFame: existingTables.includes('challenge_hall_of_fame'),
        levelRecords: existingTables.includes('challenge_level_records'),
      }
    });
  } catch (error) {
    console.error('Check tables error:', error);
    return NextResponse.json({ error: '检查数据表失败' }, { status: 500 });
  }
}
