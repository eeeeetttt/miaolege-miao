import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// 完整初始化金融系统
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  
  try {
    // 1. 给 user_accounts 添加 gold_balance 字段（如果不存在）
    try {
      await connection.execute(`
        ALTER TABLE user_accounts 
        ADD COLUMN IF NOT EXISTS gold_balance INT DEFAULT 0 AFTER coin_balance
      `);
    } catch (e) {
      // 忽略已存在的错误
    }

    // 2. 添加 coin_balance 字段（如果不存在，用于银两）
    try {
      await connection.execute(`
        ALTER TABLE user_accounts 
        ADD COLUMN IF NOT EXISTS coin_balance DECIMAL(15,2) DEFAULT 0 AFTER gold_balance
      `);
    } catch (e) {
      // 忽略已存在的错误
    }

    // 3. 添加 total_debt 字段（如果不存在）
    try {
      await connection.execute(`
        ALTER TABLE user_accounts 
        ADD COLUMN IF NOT EXISTS total_debt DECIMAL(15,2) DEFAULT 0 AFTER coin_balance
      `);
    } catch (e) {
      // 忽略已存在的错误
    }

    // 4. 创建 banks 表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS banks (
        bank_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(15,2) NOT NULL,
        owner_id VARCHAR(36) NULL,
        interest_rate DECIMAL(5,4) DEFAULT 0.005,
        max_loan DECIMAL(15,2) DEFAULT 1000000,
        daily_output INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_owner (owner_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 5. 创建 bank_loans 表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bank_loans (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        bank_id VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        last_interest_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_bank (user_id, bank_id),
        INDEX idx_user (user_id),
        INDEX idx_bank (bank_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 6. 创建 exchanges 表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS exchanges (
        exchange_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(15,2) NOT NULL,
        owner_id VARCHAR(36) NULL,
        fee_rate DECIMAL(5,4) DEFAULT 0.002,
        total_fee_earned DECIMAL(15,2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_owner (owner_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 7. 创建 exchange_trades 表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS exchange_trades (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        exchange_id VARCHAR(50) NOT NULL,
        trade_type VARCHAR(20) NOT NULL,
        trade_id VARCHAR(100) NULL,
        amount DECIMAL(15,2) NOT NULL,
        fee DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_exchange (exchange_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 8. 插入钱庄数据
    const [bankRows] = await connection.execute('SELECT COUNT(*) as cnt FROM banks');
    if ((bankRows as any)[0].cnt === 0) {
      await connection.execute(`
        INSERT INTO banks (bank_id, name, price, interest_rate, max_loan) VALUES
        ('bank1', '聚宝庄', 300000, 0.005, 1000000),
        ('bank2', '通宝庄', 600000, 0.005, 1000000),
        ('bank3', '万利庄', 1200000, 0.005, 1000000),
        ('bank4', '汇源庄', 2000000, 0.005, 1000000),
        ('bank5', '瑞丰庄', 3500000, 0.005, 1000000)
      `);
    }

    // 9. 插入交易所数据
    const [exRows] = await connection.execute('SELECT COUNT(*) as cnt FROM exchanges');
    if ((exRows as any)[0].cnt === 0) {
      await connection.execute(`
        INSERT INTO exchanges (exchange_id, name, price, fee_rate) VALUES
        ('ex1', '太白交易所', 500000, 0.002),
        ('ex2', '金源交易所', 800000, 0.002),
        ('ex3', '洪武交易所', 1200000, 0.002)
      `);
    }

    return NextResponse.json({ 
      success: true, 
      message: '初始化成功！请刷新金融中心页面' 
    });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json({ 
      error: '初始化失败', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  } finally {
    connection.release();
  }
}
