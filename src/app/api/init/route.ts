import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// 全量初始化金融系统（自动执行）
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  
  try {
    const results: string[] = [];

    // 1. 检查并添加 user_accounts 字段
    try {
      await connection.execute(`
        ALTER TABLE user_accounts 
        ADD COLUMN gold_balance INT DEFAULT 0 AFTER role
      `);
      results.push('✓ 添加 gold_balance 字段');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        results.push('✓ gold_balance 字段已存在');
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE user_accounts 
        ADD COLUMN coin_balance DECIMAL(15,2) DEFAULT 0 AFTER gold_balance
      `);
      results.push('✓ 添加 coin_balance 字段');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        results.push('✓ coin_balance 字段已存在');
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE user_accounts 
        ADD COLUMN total_debt DECIMAL(15,2) DEFAULT 0 AFTER coin_balance
      `);
      results.push('✓ 添加 total_debt 字段');
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        results.push('✓ total_debt 字段已存在');
      }
    }

    // 2. 创建 banks 表
    try {
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
      results.push('✓ banks 表创建成功');
    } catch (e: any) {
      results.push('banks 表: ' + (e.message || '已存在'));
    }

    // 3. 创建 bank_loans 表
    try {
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
      results.push('✓ bank_loans 表创建成功');
    } catch (e: any) {
      results.push('bank_loans 表: ' + (e.message || '已存在'));
    }

    // 4. 创建 exchanges 表
    try {
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
      results.push('✓ exchanges 表创建成功');
    } catch (e: any) {
      results.push('exchanges 表: ' + (e.message || '已存在'));
    }

    // 5. 创建 exchange_trades 表
    try {
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
      results.push('✓ exchange_trades 表创建成功');
    } catch (e: any) {
      results.push('exchange_trades 表: ' + (e.message || '已存在'));
    }

    // 6. 插入钱庄数据
    try {
      const [rows] = await connection.execute('SELECT COUNT(*) as cnt FROM banks');
      if ((rows as any)[0].cnt === 0) {
        await connection.execute(`
          INSERT INTO banks (bank_id, name, price, interest_rate, max_loan) VALUES
          ('bank1', '聚宝庄', 300000, 0.005, 1000000),
          ('bank2', '通宝庄', 600000, 0.005, 1000000),
          ('bank3', '万利庄', 1200000, 0.005, 1000000),
          ('bank4', '汇源庄', 2000000, 0.005, 1000000),
          ('bank5', '瑞丰庄', 3500000, 0.005, 1000000)
        `);
        results.push('✓ 5个钱庄数据插入成功');
      } else {
        results.push('✓ 钱庄数据已存在');
      }
    } catch (e: any) {
      results.push('钱庄数据: ' + (e.message || '已存在'));
    }

    // 7. 插入交易所数据
    try {
      const [rows] = await connection.execute('SELECT COUNT(*) as cnt FROM exchanges');
      if ((rows as any)[0].cnt === 0) {
        await connection.execute(`
          INSERT INTO exchanges (exchange_id, name, price, fee_rate) VALUES
          ('ex1', '太白交易所', 500000, 0.002),
          ('ex2', '金源交易所', 800000, 0.002),
          ('ex3', '洪武交易所', 1200000, 0.002)
        `);
        results.push('✓ 3个交易所数据插入成功');
      } else {
        results.push('✓ 交易所数据已存在');
      }
    } catch (e: any) {
      results.push('交易所数据: ' + (e.message || '已存在'));
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: '初始化完成！'
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

// GET 请求也自动初始化
export async function GET() {
  return POST(new NextRequest('http://localhost'));
}
