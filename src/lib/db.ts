import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

// 加载环境变量
try {
  const { config } = await import('dotenv');
  config();
} catch {}

// 创建连接池
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'trade',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,
});

// 初始化标志
let isInitialized = false;

// 自动初始化金融系统
async function initializeFinanceTables() {
  if (isInitialized) return;
  
  try {
    const connection = await pool.getConnection();
    
    try {
      // 添加 user_accounts 缺失字段
      try { await connection.execute(`ALTER TABLE user_accounts ADD COLUMN gold_balance INT DEFAULT 0 AFTER role`); } catch {}
      try { await connection.execute(`ALTER TABLE user_accounts ADD COLUMN coin_balance DECIMAL(15,2) DEFAULT 0 AFTER gold_balance`); } catch {}
      try { await connection.execute(`ALTER TABLE user_accounts ADD COLUMN total_debt DECIMAL(15,2) DEFAULT 0 AFTER coin_balance`); } catch {}
      try { await connection.execute(`ALTER TABLE user_accounts ADD COLUMN active_title VARCHAR(50) DEFAULT NULL AFTER avatar_url`); } catch {}

      // user_titles 表创建
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS user_titles (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            title_id VARCHAR(50) NOT NULL,
            obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            UNIQUE KEY uk_user_title (user_id, title_id),
            INDEX idx_user (user_id),
            INDEX idx_title (title_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
      } catch (e) {
        console.error('[Init] user_titles表创建失败:', e);
      }

      // titles 表创建
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS titles (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            rarity VARCHAR(20) DEFAULT 'common',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        
        // 插入默认称号
        const [titleRows] = await connection.execute('SELECT COUNT(*) as cnt FROM titles');
        if ((titleRows as any)[0].cnt === 0) {
          await connection.execute(`
            INSERT INTO titles (id, name, description, rarity) VALUES
            ('kline_master', 'K线宗师', '通关K线征途10关获得的称号', 'legendary'),
            ('trading_master', '交易大师', '月度总决赛冠军获得', 'legendary'),
            ('daily_king', '每日之王', '连续7天获得每日挑战冠军', 'rare'),
            ('ladder_master', '天梯大师', '天梯赛连续3个月前三', 'rare')
          `);
        }
      } catch (e) {
        console.error('[Init] titles表创建失败:', e);
      }

      // 创建管理员用户（如果不存在）
      try {
        const [adminRows] = await connection.execute("SELECT COUNT(*) as cnt FROM user_accounts WHERE email = '497209390@qq.com'");
        if ((adminRows as any)[0].cnt === 0) {
          await connection.execute(`
            INSERT INTO user_accounts (user_id, email, password_hash, name, role, gold_balance, coin_balance, total_debt)
            VALUES ('admin_497209390', '497209390@qq.com', 'placeholder', '管理员', 'admin', 10000, 1000000, '0.00')
          `);
          console.log('[Init] 创建管理员用户成功');
        }
      } catch (e) {
        console.error('[Init] 创建管理员用户失败:', e);
      }

      // banks 表创建
      try {
        await connection.query(`
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
        
        // 插入钱庄数据
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
        }
      } catch (e) {
        console.error('[Init] banks表创建失败:', e);
      }

      // exchanges 表创建
      try {
        await connection.query(`
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
        
        // 插入交易所数据
        const [exRows] = await connection.execute('SELECT COUNT(*) as cnt FROM exchanges');
        if ((exRows as any)[0].cnt === 0) {
          await connection.execute(`
            INSERT INTO exchanges (exchange_id, name, price, fee_rate) VALUES
            ('ex1', '太白交易所', 500000, 0.002),
            ('ex2', '金源交易所', 800000, 0.002),
            ('ex3', '洪武交易所', 1200000, 0.002)
          `);
        }
      } catch (e) {
        console.error('[Init] exchanges表创建失败:', e);
      }

      // bank_loans 表创建
      try {
        await connection.query(`
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
      } catch (e) {
        console.error('[Init] bank_loans表创建失败:', e);
      }

      // exchange_trades 表创建
      try {
        await connection.query(`
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
      } catch (e) {
        console.error('[Init] exchange_trades表创建失败:', e);
      }

      console.log('[Init] 金融系统表和数据初始化完成');
      isInitialized = true;

      // 初始化赛事系统表
      try {
        // match_accounts 表创建
        try {
          await connection.query(`
            CREATE TABLE IF NOT EXISTS match_accounts (
              id BIGINT AUTO_INCREMENT PRIMARY KEY,
              user_id VARCHAR(36) NOT NULL,
              match_id VARCHAR(200) NOT NULL,
              match_type ENUM('kline', 'ladder', 'master', 'monthly', 'daily') NOT NULL,
              initial_capital DECIMAL(15,2) NOT NULL,
              current_balance DECIMAL(15,2) NOT NULL,
              status ENUM('active', 'completed', 'failed') DEFAULT 'active',
              current_level INT DEFAULT 1,
              season_month VARCHAR(7) DEFAULT '',
              started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              ended_at TIMESTAMP NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_user_match (user_id, match_type),
              INDEX idx_match_type (match_type, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          console.log('[Init] match_accounts 表创建成功');
        } catch (e) {
          console.error('[Init] match_accounts 表创建失败:', e);
        }

        // match_configs 表创建
        try {
          await connection.query(`
            CREATE TABLE IF NOT EXISTS match_configs (
              id INT AUTO_INCREMENT PRIMARY KEY,
              match_type VARCHAR(50) NOT NULL,
              config_key VARCHAR(100) NOT NULL,
              config_value TEXT,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uk_match_config (match_type, config_key),
              INDEX idx_match_type (match_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          
          // 插入默认配置
          const [cfgRows] = await connection.execute('SELECT COUNT(*) as cnt FROM match_configs');
          if ((cfgRows as any)[0].cnt === 0) {
            await connection.execute(`
              INSERT INTO match_configs (match_type, config_key, config_value) VALUES
              ('kline', 'entry_fee_gold', '200'),
              ('kline', 'initial_capital_silver', '1000'),
              ('kline', 'level_targets', '[1100,1200,1300,1400,1500,1600,1700,1800,1900,2000]'),
              ('kline', 'fail_threshold', '100'),
              ('kline', 'completion_reward_gold', '3000'),
              ('kline', 'completion_title', 'K线宗师'),
              ('kline', 'enabled', 'true'),
              ('ladder', 'entry_capital_silver', '10000'),
              ('ladder', 'season_days', '30'),
              ('ladder', 'reward_tiers', '[{\"rank_from\":1,\"rank_to\":1,\"reward_gold\":5000},{\"rank_from\":2,\"rank_to\":10,\"reward_gold\":2000},{\"rank_from\":11,\"rank_to\":50,\"reward_gold\":500},{\"rank_from\":51,\"rank_to\":100,\"reward_gold\":100}]'),
              ('ladder', 'enabled', 'true'),
              ('daily', 'entry_fee_gold', '50'),
              ('daily', 'initial_capital_silver', '10000'),
              ('daily', 'entry_start_hour', '0'),
              ('daily', 'entry_end_hour', '20'),
              ('daily', 'rewards', '[{\"rank\":1,\"gold\":500,\"silver\":5000},{\"rank\":2,\"gold\":300,\"silver\":3000},{\"rank\":3,\"gold\":200,\"silver\":2000},{\"rank\":4,\"rank_to\":10,\"gold\":100,\"silver\":1000}]'),
              ('daily', 'enabled', 'true'),
              ('master', 'entry_fee_gold', '500'),
              ('master', 'initial_capital_silver', '100000'),
              ('master', 'round_days', '7'),
              ('master', 'participant_limit', '64'),
              ('master', 'enabled', 'false'),
              ('monthly', 'initial_capital_silver', '100000'),
              ('monthly', 'duration_days', '3'),
              ('monthly', 'enabled', 'false')
            `);
          }
        } catch {}

        // match_records 表创建
        try {
          await connection.query(`
            CREATE TABLE IF NOT EXISTS match_records (
              id BIGINT AUTO_INCREMENT PRIMARY KEY,
              user_id VARCHAR(36) NOT NULL,
              match_type VARCHAR(50) NOT NULL,
              match_id VARCHAR(200) NOT NULL,
              initial_capital DECIMAL(15,2) NOT NULL,
              final_balance DECIMAL(15,2) NOT NULL,
              profit DECIMAL(15,2) NOT NULL,
              profit_rate DECIMAL(10,4) NOT NULL,
              \`rank\` INT DEFAULT NULL,
              reward_gold INT DEFAULT 0,
              reward_silver DECIMAL(15,2) DEFAULT 0,
              completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_user_match_record (user_id, match_type),
              INDEX idx_match_rank (match_type, match_id, \`rank\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          console.log('[Init] match_records 表创建成功');
        } catch (e) {
          console.error('[Init] match_records 表创建失败:', e);
        }

        console.log('[Init] 赛事系统表和配置初始化完成');

        // match_trade_records 表创建
        try {
          await connection.query(`
            CREATE TABLE IF NOT EXISTS match_trade_records (
              id BIGINT AUTO_INCREMENT PRIMARY KEY,
              user_id VARCHAR(36) NOT NULL,
              match_type VARCHAR(50) NOT NULL,
              match_id VARCHAR(200) NOT NULL,
              action VARCHAR(50) NOT NULL,
              direction VARCHAR(10) DEFAULT NULL,
              lots INT DEFAULT 1,
              profit DECIMAL(15, 2) DEFAULT 0,
              balance_after DECIMAL(15, 2) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_user_trade (user_id, match_type),
              INDEX idx_match_trade (match_type, match_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          console.log('[Init] match_trade_records 表创建成功');
        } catch (e) {
          console.error('[Init] match_trade_records 表创建失败:', e);
        }
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS match_positions (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            match_type VARCHAR(50) NOT NULL,
            match_id VARCHAR(200) NOT NULL,
            direction VARCHAR(10) NOT NULL,
            lots DECIMAL(10,2) NOT NULL,
            leverage INT DEFAULT 500,
            entry_price DECIMAL(15,4) NOT NULL,
            stop_loss DECIMAL(15,4) DEFAULT NULL,
            take_profit DECIMAL(15,4) DEFAULT NULL,
            status VARCHAR(20) DEFAULT 'open',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            closed_at TIMESTAMP NULL,
            INDEX idx_user_position (user_id, match_type, status),
            INDEX idx_match_position (match_type, match_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('[Init] match_positions 表创建成功');
      } catch (error) {
        console.error('[Init] match_positions 表创建失败:', error);
      }

        console.log('[Init] 赛事持仓表初始化完成');

      } catch (error) {
        console.error('[Init] 赛事系统表创建失败:', error);
      }
      
      // 验证表是否创建成功
      try {
        const [tables] = await connection.query('SHOW TABLES LIKE "match_positions"');
        if ((tables as any).length === 0) {
          console.error('[Init] ERROR: match_positions 表创建失败!');
        } else {
          console.log('[Init] match_positions 表验证成功');
        }
      } catch (error) {
        console.error('[Init] 验证表失败:', error);
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Init] 金融系统初始化失败:', error);
    throw error; // 重新抛出错误以便发现问题
  }
}

// 启动时初始化
initializeFinanceTables().catch(console.error);

// 导出数据库查询函数
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  try {
    const [rows] = await pool.query(sql, params);
    return rows as T[];
  } catch (error) {
    console.error('[DB Query Error]:', error);
    throw error;
  }
}

export const db = drizzle(pool, { schema, mode: 'default' });
export { pool, initializeFinanceTables };
