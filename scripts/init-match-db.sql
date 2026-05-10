-- 金火火挑战赛数据库初始化脚本
-- 执行方式：在 Supabase SQL编辑器 或 数据库管理工具 中执行

-- 1. 创建持仓记录表
CREATE TABLE IF NOT EXISTS match_positions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  match_type VARCHAR(50) NOT NULL,
  match_id VARCHAR(200) NOT NULL,
  direction VARCHAR(10) NOT NULL COMMENT 'long or short',
  lots DECIMAL(10,2) NOT NULL COMMENT '手数',
  leverage INT DEFAULT 500 COMMENT '杠杆倍数',
  entry_price DECIMAL(15,4) NOT NULL COMMENT '开仓价格',
  stop_loss DECIMAL(15,4) DEFAULT NULL COMMENT '止损价格',
  take_profit DECIMAL(15,4) DEFAULT NULL COMMENT '止盈价格',
  status VARCHAR(20) DEFAULT 'open' COMMENT 'open/closed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP DEFAULT NULL,
  INDEX idx_user_position (user_id, match_type, status),
  INDEX idx_match_position (match_type, match_id)
);

-- 2. 创建挑战账户表
CREATE TABLE IF NOT EXISTS match_accounts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  match_type VARCHAR(50) NOT NULL,
  match_id VARCHAR(200) NOT NULL,
  current_level INT DEFAULT 1,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_profit DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_account (user_id, match_type),
  INDEX idx_match_account (match_type, status)
);

-- 3. 创建挑战记录表
CREATE TABLE IF NOT EXISTS match_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  match_type VARCHAR(50) NOT NULL,
  match_id VARCHAR(200) NOT NULL,
  initial_capital DECIMAL(15,2) NOT NULL DEFAULT 0,
  final_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  profit DECIMAL(15,2) NOT NULL DEFAULT 0,
  profit_rate DECIMAL(10,4) NOT NULL DEFAULT 0,
  rank INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_record (user_id, match_type),
  INDEX idx_match_record (match_type, match_id),
  INDEX idx_rank (match_type, rank)
);

-- 4. 创建交易记录表
CREATE TABLE IF NOT EXISTS match_trade_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  match_type VARCHAR(50) NOT NULL,
  match_id VARCHAR(200) NOT NULL,
  action VARCHAR(50) NOT NULL,
  direction VARCHAR(10) DEFAULT NULL,
  lots INT DEFAULT 1,
  profit DECIMAL(15,2) DEFAULT 0,
  balance_after DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_trade (user_id, match_type),
  INDEX idx_match_trade (match_type, match_id)
);

-- 5. 创建赛事配置表
CREATE TABLE IF NOT EXISTS match_config (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  match_type VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  entry_fee INT DEFAULT 1000,
  initial_capital DECIMAL(15,2) DEFAULT 1000.00,
  fail_threshold DECIMAL(15,2) DEFAULT 100.00,
  completion_target DECIMAL(15,2) DEFAULT 2000.00,
  completion_reward INT DEFAULT 5000,
  settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 初始化五大赛事配置
INSERT INTO match_config (match_type, name, description, entry_fee, initial_capital, fail_threshold, completion_target, completion_reward) VALUES
('kline', 'K线征途', '挑战伦敦金K线分析能力，从新手到大师的进阶之路', 1000, 1000.00, 100.00, 2000.00, 5000),
('ladder', '天梯赛', '排位赛模式，与全服交易高手一较高下', 1000, 1000.00, 100.00, 2000.00, 5000),
('daily', '每日挑战', '每日一题，考验盘感与快速决策能力', 500, 1000.00, 100.00, 1500.00, 2000),
('master', '大师邀请', '高手云集，限大师段位以上参与', 2000, 5000.00, 500.00, 10000.00, 10000),
('monthly', '月度决赛', '月度巅峰对决，赢取月度大奖', 5000, 10000.00, 1000.00, 20000.00, 50000)
ON DUPLICATE KEY UPDATE name=VALUES(name);

SELECT '数据库初始化完成!' as status;
