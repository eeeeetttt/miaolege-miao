import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';

export default async function handler(
  req: Request,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const connection = await pool.getConnection();
    
    // 创建聊天室相关表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_hall_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_system BOOLEAN DEFAULT FALSE,
        is_premium BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_hall_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        enabled BOOLEAN DEFAULT TRUE,
        cooldown_seconds INT DEFAULT 60,
        max_message_length INT DEFAULT 500
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_hall_mutes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        reason TEXT,
        muted_by VARCHAR(255),
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 插入默认配置
    await connection.execute(`
      INSERT IGNORE INTO chat_hall_config (id, enabled, cooldown_seconds, max_message_length) 
      VALUES (1, TRUE, 60, 500)
    `);

    // 创建AI新闻表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        category VARCHAR(100),
        source VARCHAR(200),
        is_published BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        INDEX idx_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建用户账户表（如果不存在）
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        balance DECIMAL(10, 2) DEFAULT 0,
        frozen_balance DECIMAL(10, 2) DEFAULT 0,
        total_profit DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 创建挑战赛相关表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS challenge_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        level INT DEFAULT 1,
        status ENUM('pending', 'approved', 'active', 'completed', 'failed', 'rejected') DEFAULT 'pending',
        server VARCHAR(255),
        account VARCHAR(255),
        password VARCHAR(255),
        initial_balance DECIMAL(10, 2) DEFAULT 1000,
        current_balance DECIMAL(10, 2),
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP NULL,
        started_at TIMESTAMP NULL,
        ended_at TIMESTAMP NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS challenge_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        registration_fee INT DEFAULT 1000,
        initial_balance INT DEFAULT 1000,
        pass_balance INT DEFAULT 2000,
        fail_balance INT DEFAULT 100,
        max_days INT DEFAULT 30
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      INSERT IGNORE INTO challenge_config (id, registration_fee, initial_balance, pass_balance, fail_balance, max_days) 
      VALUES (1, 1000, 1000, 2000, 100, 30)
    `);

    connection.release();

    return Response.json({ 
      success: true, 
      message: '数据库表初始化成功',
      tables: [
        'chat_hall_messages',
        'chat_hall_config', 
        'chat_hall_mutes',
        'ai_news',
        'user_accounts',
        'challenge_registrations',
        'challenge_config'
      ]
    });
  } catch (error) {
    console.error('初始化数据库失败:', error);
    return Response.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
