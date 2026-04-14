-- K线征途挑战赛数据库表结构 (PostgreSQL)
-- 运行此脚本创建所有必要的表

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  name VARCHAR(255),
  avatar VARCHAR(500),
  coin_balance INT DEFAULT 0,
  role VARCHAR(20) DEFAULT 'user',
  name_updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 星球表
CREATE TABLE IF NOT EXISTS planets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules TEXT,
  creator_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  coins INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  ticket_price INT DEFAULT 0,
  invite_code VARCHAR(50),
  max_publishers INT DEFAULT 3,
  status VARCHAR(20) DEFAULT 'active',
  duration_days INT DEFAULT 365,
  expire_at TIMESTAMP,
  owner_as_publisher BOOLEAN DEFAULT FALSE,
  forum_enabled BOOLEAN DEFAULT FALSE
);

-- 星球成员表
CREATE TABLE IF NOT EXISTS planet_members (
  id SERIAL PRIMARY KEY,
  planet_id INT NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  join_method VARCHAR(20) DEFAULT 'purchase',
  ticket_paid INT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT NOW(),
  expiry_date TIMESTAMP,
  UNIQUE(planet_id, user_id)
);

-- 星球申请表
CREATE TABLE IF NOT EXISTS planet_applications (
  id SERIAL PRIMARY KEY,
  planet_id INT NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  applied_at TIMESTAMP DEFAULT NOW(),
  handled_at TIMESTAMP,
  UNIQUE(planet_id, user_id)
);

-- 星球收益表
CREATE TABLE IF NOT EXISTS planet_earnings (
  id SERIAL PRIMARY KEY,
  planet_id INT NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount INT NOT NULL,
  type VARCHAR(20) DEFAULT 'ticket',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 信号表
CREATE TABLE IF NOT EXISTS signals (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  sender_account VARCHAR(255) NOT NULL,
  signal_type VARCHAR(50) NOT NULL,
  ticket BIGINT,
  symbol VARCHAR(50),
  order_type VARCHAR(10),
  volume DECIMAL(10, 2),
  price DECIMAL(10, 4),
  sl DECIMAL(10, 4),
  tp DECIMAL(10, 4),
  comment TEXT,
  user_id VARCHAR(255),
  deal_profit DECIMAL(10, 2),
  balance DECIMAL(10, 2),
  broker VARCHAR(255),
  planet_id INT REFERENCES planets(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_sender_account ON signals(sender_account);
CREATE INDEX IF NOT EXISTS idx_planet ON signals(planet_id);

-- NextAuth 表
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  userId VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  providerAccountId VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type VARCHAR(255),
  scope VARCHAR(255),
  id_token TEXT,
  session_state VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  userId VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL,
  sessionToken VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires TIMESTAMP NOT NULL
);

-- MT账户表
CREATE TABLE IF NOT EXISTS mt_accounts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  account_number VARCHAR(50) NOT NULL,
  broker VARCHAR(255),
  platform VARCHAR(10) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(account_number, platform)
);

-- 跟单记录表
CREATE TABLE IF NOT EXISTS follow_records (
  id SERIAL PRIMARY KEY,
  planet_id INT NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  signal_id BIGINT NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active',
  copy_volume DECIMAL(10, 2),
  copy_ratio DECIMAL(5, 2) DEFAULT '1.00',
  created_at TIMESTAMP DEFAULT NOW(),
  paused_at TIMESTAMP,
  closed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_planet_user_follow ON follow_records(planet_id, user_id);
CREATE INDEX IF NOT EXISTS idx_signal_follow ON follow_records(signal_id);

-- 充值记录表
CREATE TABLE IF NOT EXISTS coin_recharges (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount INT NOT NULL,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_user_recharge ON coin_recharges(user_id);
CREATE INDEX IF NOT EXISTS idx_recharge_status ON coin_recharges(status);

-- EA产品表
CREATE TABLE IF NOT EXISTS ea_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INT NOT NULL,
  version VARCHAR(50) DEFAULT '1.0.0',
  platform VARCHAR(10) DEFAULT 'Both',
  category VARCHAR(100),
  features TEXT,
  download_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INT,
  image_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active',
  sales_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- EA购买记录表
CREATE TABLE IF NOT EXISTS ea_purchases (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES ea_products(id) ON DELETE CASCADE,
  price INT NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  purchased_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_user_ea_purchase ON ea_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_ea_product_purchase ON ea_purchases(product_id);

-- 文档表
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  sort_order INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'published',
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_category ON documents(category);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 论坛帖子表
CREATE TABLE IF NOT EXISTS forum_posts (
  id SERIAL PRIMARY KEY,
  planet_id INT NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_post_planet ON forum_posts(planet_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_user ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_post_status ON forum_posts(status);

-- 论坛评论表
CREATE TABLE IF NOT EXISTS forum_comments (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id INT,
  like_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_comment_post ON forum_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_comment_user ON forum_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_comment_parent ON forum_comments(parent_id);

-- 论坛点赞表
CREATE TABLE IF NOT EXISTS forum_likes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_forum_like_target ON forum_likes(target_type, target_id);

-- 论坛禁言表
CREATE TABLE IF NOT EXISTS forum_bans (
  id SERIAL PRIMARY KEY,
  planet_id INT NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  banned_by VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reason VARCHAR(500),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(planet_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_forum_ban_planet ON forum_bans(planet_id);

-- 挑战赛报名表
CREATE TABLE IF NOT EXISTS challenge_registrations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  current_level INT DEFAULT 1,
  completed_levels TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  failed_level INT,
  total_duration INT,
  server_name VARCHAR(255),
  trading_account VARCHAR(50),
  trading_password VARCHAR(255),
  mt_account_id INT REFERENCES mt_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_challenge_user ON challenge_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_status ON challenge_registrations(status);

-- 挑战赛配置表
CREATE TABLE IF NOT EXISTS challenge_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 挑战赛关卡配置表
CREATE TABLE IF NOT EXISTS challenge_level_config (
  id SERIAL PRIMARY KEY,
  level INT NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  target_balance INT NOT NULL DEFAULT 2000,
  initial_balance INT NOT NULL DEFAULT 1000,
  fail_balance INT NOT NULL DEFAULT 100,
  reward VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 挑战赛名人堂表
CREATE TABLE IF NOT EXISTS challenge_hall_of_fame (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  registration_id INT NOT NULL REFERENCES challenge_registrations(id) ON DELETE CASCADE,
  display_name VARCHAR(255) DEFAULT '匿名用户',
  is_anonymous BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NOT NULL,
  total_duration INT NOT NULL,
  reward_claimed BOOLEAN DEFAULT FALSE,
  reward_claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_hall_completed_at ON challenge_hall_of_fame(completed_at);

-- 挑战赛关卡记录表
CREATE TABLE IF NOT EXISTS challenge_level_records (
  id SERIAL PRIMARY KEY,
  registration_id INT NOT NULL REFERENCES challenge_registrations(id) ON DELETE CASCADE,
  level INT NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration INT,
  status VARCHAR(20) DEFAULT 'active'
);

-- 聊天大厅配置表
CREATE TABLE IF NOT EXISTS chat_hall_config (
  id SERIAL PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE,
  cooldown_seconds INT DEFAULT 60,
  max_message_length INT DEFAULT 500,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 聊天大厅消息表
CREATE TABLE IF NOT EXISTS chat_hall_messages (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 聊天大厅禁言表
CREATE TABLE IF NOT EXISTS chat_hall_mutes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  reason VARCHAR(500),
  muted_by VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 星球币余额表
CREATE TABLE IF NOT EXISTS coin_balances (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  balance INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 星球币转账记录表
CREATE TABLE IF NOT EXISTS coin_transfers (
  id SERIAL PRIMARY KEY,
  from_user_id VARCHAR(255) NOT NULL,
  to_user_id VARCHAR(255) NOT NULL,
  amount INT NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transfer_from ON coin_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_to ON coin_transfers(to_user_id);

-- 私信表
CREATE TABLE IF NOT EXISTS private_messages (
  id SERIAL PRIMARY KEY,
  from_user_id VARCHAR(255) NOT NULL,
  to_user_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_private_from ON private_messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_private_to ON private_messages(to_user_id);

-- 用户关注表
CREATE TABLE IF NOT EXISTS user_follows (
  id SERIAL PRIMARY KEY,
  follower_id VARCHAR(255) NOT NULL,
  following_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_following ON user_follows(following_id);

-- 插入默认挑战赛配置
INSERT INTO challenge_config (config_key, config_value, description) VALUES
  ('registration_fee', '1000', '报名费用（星球币）'),
  ('challenge_enabled', 'true', '挑战赛是否启用'),
  ('fail_balance', '100', '失败底线净值'),
  ('target_balance', '2000', '通关目标净值'),
  ('profit_target', '1000', '盈利目标'),
  ('show_leaderboard', 'true', '是否显示排行榜'),
  ('completion_reward', '100000', '通关奖励（星球币）')
ON CONFLICT (config_key) DO NOTHING;

-- 插入默认关卡配置
INSERT INTO challenge_level_config (level, name, description, target_balance, initial_balance, fail_balance, reward) VALUES
  (1, '初出茅庐', '完成10笔交易，净值达到1200', 1200, 1000, 100, '初级交易员徽章'),
  (2, '小试牛刀', '完成20笔交易，净值达到1400', 1400, 1200, 100, '进阶交易员徽章'),
  (3, '崭露头角', '完成30笔交易，净值达到1600', 1600, 1400, 100, '熟练交易员徽章'),
  (4, '炉火纯青', '完成40笔交易，净值达到1800', 1800, 1600, 100, '高级交易员徽章'),
  (5, '出神入化', '完成50笔交易，净值达到2000', 2000, 1800, 100, '专家交易员徽章')
ON CONFLICT (level) DO NOTHING;

-- 插入聊天大厅默认配置
INSERT INTO chat_hall_config (enabled, cooldown_seconds, max_message_length) VALUES
  (TRUE, 60, 500)
ON CONFLICT DO NOTHING;
