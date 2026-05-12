import { pool } from '@/lib/db';

export async function POST() {
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

    connection.release();

    return Response.json({ 
      success: true, 
      message: '数据库表初始化成功',
      tables: ['chat_hall_messages', 'chat_hall_config', 'chat_hall_mutes', 'ai_news']
    });
  } catch (error) {
    console.error('初始化数据库失败:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '初始化失败' 
    }, { status: 500 });
  }
}
