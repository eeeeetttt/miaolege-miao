import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    // Verify admin password
    if (password !== process.env.ADMIN_PASSWORD && password !== 'admin123') {
      return NextResponse.json({ error: '密码错误' }, { status: 403 });
    }

    const connection = await pool.getConnection();

    try {
      // Disable foreign key checks temporarily
      await connection.execute(`SET FOREIGN_KEY_CHECKS = 0`);
      
      // Drop existing tables
      await connection.execute(`DROP TABLE IF EXISTS software_purchases`);
      await connection.execute(`DROP TABLE IF EXISTS follow_purchases`);
      await connection.execute(`DROP TABLE IF EXISTS verification_tokens`);
      await connection.execute(`DROP TABLE IF EXISTS sessions`);
      await connection.execute(`DROP TABLE IF EXISTS accounts`);
      await connection.execute(`DROP TABLE IF EXISTS signals`);
      await connection.execute(`DROP TABLE IF EXISTS planet_earnings`);
      await connection.execute(`DROP TABLE IF EXISTS planet_applications`);
      await connection.execute(`DROP TABLE IF EXISTS planet_members`);
      await connection.execute(`DROP TABLE IF EXISTS planets`);
      await connection.execute(`DROP TABLE IF EXISTS users`);
      
      // Re-enable foreign key checks
      await connection.execute(`SET FOREIGN_KEY_CHECKS = 1`);

      // Create users table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          user_id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE,
          password VARCHAR(255),
          name VARCHAR(255),
          coin_balance INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Create planets table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS planets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          rules TEXT,
          creator_id VARCHAR(255) NOT NULL,
          coins INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ticket_price INT DEFAULT 0,
          invite_code VARCHAR(50),
          max_publishers INT DEFAULT 3,
          status ENUM('active','closed') DEFAULT 'active',
          duration_days INT DEFAULT 365,
          FOREIGN KEY (creator_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Create planet_members table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS planet_members (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planet_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          role ENUM('owner','publisher','follower') NOT NULL,
          join_method ENUM('purchase','invite') DEFAULT 'purchase',
          ticket_paid INT DEFAULT 0,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expiry_date TIMESTAMP NULL,
          FOREIGN KEY (planet_id) REFERENCES planets(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          UNIQUE KEY uk_planet_user (planet_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Create planet_applications table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS planet_applications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planet_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          status ENUM('pending','approved','rejected') DEFAULT 'pending',
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          handled_at TIMESTAMP NULL,
          FOREIGN KEY (planet_id) REFERENCES planets(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          UNIQUE KEY uk_planet_user_app (planet_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Create planet_earnings table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS planet_earnings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planet_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          amount INT NOT NULL,
          type ENUM('ticket') DEFAULT 'ticket',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (planet_id) REFERENCES planets(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Create signals table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS signals (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          sender_account VARCHAR(255) NOT NULL,
          signal_type VARCHAR(50) NOT NULL,
          ticket BIGINT,
          symbol VARCHAR(50),
          order_type VARCHAR(10),
          volume DECIMAL(10,2),
          price DECIMAL(10,4),
          sl DECIMAL(10,4),
          tp DECIMAL(10,4),
          comment TEXT,
          user_id VARCHAR(255),
          deal_profit DECIMAL(10,2),
          planet_id INT DEFAULT NULL,
          INDEX idx_sender_account (sender_account),
          INDEX idx_planet (planet_id),
          FOREIGN KEY (planet_id) REFERENCES planets(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Create NextAuth tables
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId VARCHAR(255) NOT NULL,
          type VARCHAR(255) NOT NULL,
          provider VARCHAR(255) NOT NULL,
          providerAccountId VARCHAR(255) NOT NULL,
          refresh_token TEXT,
          access_token TEXT,
          expires_at BIGINT,
          token_type VARCHAR(255),
          scope VARCHAR(255),
          id_token TEXT,
          session_state VARCHAR(255),
          INDEX(provider, providerAccountId),
          FOREIGN KEY (userId) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId VARCHAR(255) NOT NULL,
          expires TIMESTAMP NOT NULL,
          sessionToken VARCHAR(255) NOT NULL UNIQUE,
          FOREIGN KEY (userId) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await connection.execute(`
        CREATE TABLE IF NOT EXISTS verification_tokens (
          identifier VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires TIMESTAMP NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Create MT accounts table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS mt_accounts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          account_number VARCHAR(50) NOT NULL,
          broker VARCHAR(255),
          platform ENUM('MT4', 'MT5') NOT NULL,
          is_verified BOOLEAN DEFAULT FALSE,
          verified_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_user_mt_account (user_id),
          UNIQUE KEY uk_mt_account_number (account_number, platform),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Create follow records table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS follow_records (
          id INT AUTO_INCREMENT PRIMARY KEY,
          planet_id INT NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          signal_id BIGINT NOT NULL,
          status ENUM('active', 'paused', 'closed') DEFAULT 'active',
          copy_volume DECIMAL(10,2),
          copy_ratio DECIMAL(5,2) DEFAULT 1.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          paused_at TIMESTAMP NULL,
          closed_at TIMESTAMP NULL,
          INDEX idx_planet_user_follow (planet_id, user_id),
          INDEX idx_signal_follow (signal_id),
          FOREIGN KEY (planet_id) REFERENCES planets(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (signal_id) REFERENCES signals(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Create coin recharges table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS coin_recharges (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          amount INT NOT NULL,
          payment_method VARCHAR(50),
          transaction_id VARCHAR(255),
          status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
          admin_note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP NULL,
          INDEX idx_user_recharge (user_id),
          INDEX idx_recharge_status (status),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      return NextResponse.json({
        success: true,
        message: '数据库初始化成功',
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: '数据库初始化失败', details: String(error) },
      { status: 500 }
    );
  }
}
