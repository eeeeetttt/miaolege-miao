import { mysqlTable, varchar, text, int, timestamp, decimal, mysqlEnum, boolean, uniqueIndex, index } from 'drizzle-orm/mysql-core';
import { drizzle } from 'drizzle-orm/mysql2';

// User Accounts Table (用户账户表)
export const users = mysqlTable('user_accounts', {
  userId: varchar('user_id', { length: 36 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).default('用户'),
  role: mysqlEnum('role', ['admin', 'user', 'vip']).default('user'),
  // 货币系统
  coinBalance: decimal('coin_balance', { precision: 15, scale: 2 }).default('0.00'),      // 银两余额
  goldBalance: int('gold_balance').default(0),                                           // 金币余额
  totalDebt: decimal('total_debt', { precision: 15, scale: 2 }).default('0.00'),          // 总负债
  avatarUrl: varchar('avatar_url', { length: 500 }),
  activeTitle: varchar('active_title', { length: 50 }),                                   // 当前称号
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  emailIdx: index('idx_email').on(table.email),
}));

// Alias for user accounts
export const userAccounts = users;

// Planets Table
export const planets = mysqlTable('planets', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  rules: text('rules'),
  creatorId: varchar('creator_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  coins: int('coins').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  ticketPrice: int('ticket_price').default(0),
  inviteCode: varchar('invite_code', { length: 50 }),
  maxPublishers: int('max_publishers').default(3),
  status: mysqlEnum('status', ['active', 'closed']).default('active'),
  durationDays: int('duration_days').default(365), // 星球时长天数（0表示永久）
  expireAt: timestamp('expire_at'), // 星球过期时间（null表示永久）
  ownerAsPublisher: boolean('owner_as_publisher').default(false),
  forumEnabled: boolean('forum_enabled').default(false), // 是否开启论坛
});

// Planet Members Table
export const planetMembers = mysqlTable('planet_members', {
  id: int('id').autoincrement().primaryKey(),
  planetId: int('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  role: mysqlEnum('role', ['owner', 'publisher', 'follower']).notNull(),
  joinMethod: mysqlEnum('join_method', ['purchase', 'invite']).default('purchase'),
  ticketPaid: int('ticket_paid').default(0),
  joinedAt: timestamp('joined_at').defaultNow(),
  expiryDate: timestamp('expiry_date'),
}, (table) => ({
  planetUserUnique: uniqueIndex('uk_planet_user').on(table.planetId, table.userId),
}));

// Planet Applications Table
export const planetApplications = mysqlTable('planet_applications', {
  id: int('id').autoincrement().primaryKey(),
  planetId: int('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected']).default('pending'),
  appliedAt: timestamp('applied_at').defaultNow(),
  handledAt: timestamp('handled_at'),
}, (table) => ({
  planetUserAppUnique: uniqueIndex('uk_planet_user_app').on(table.planetId, table.userId),
}));

// Planet Earnings Table
export const planetEarnings = mysqlTable('planet_earnings', {
  id: int('id').autoincrement().primaryKey(),
  planetId: int('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  amount: int('amount').notNull(),
  type: mysqlEnum('type', ['ticket']).default('ticket'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Signals Table
export const signals = mysqlTable('signals', {
  id: int('id').autoincrement().primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
  senderAccount: varchar('sender_account', { length: 255 }).notNull(),
  signalType: varchar('signal_type', { length: 50 }).notNull(),
  ticket: int('ticket'),
  symbol: varchar('symbol', { length: 50 }),
  orderType: varchar('order_type', { length: 10 }),
  volume: decimal('volume', { precision: 10, scale: 2 }),
  price: decimal('price', { precision: 10, scale: 4 }),
  sl: decimal('sl', { precision: 10, scale: 4 }),
  tp: decimal('tp', { precision: 10, scale: 4 }),
  comment: text('comment'),
  userId: varchar('user_id', { length: 255 }),
  dealProfit: decimal('deal_profit', { precision: 10, scale: 2 }),
  balance: decimal('balance', { precision: 10, scale: 2 }),
  broker: varchar('broker', { length: 255 }),
  planetId: int('planet_id').references(() => planets.id, { onDelete: 'set null' }),
}, (table) => ({
  senderAccountIdx: index('idx_sender_account').on(table.senderAccount),
  planetIdx: index('idx_planet').on(table.planetId),
}));

// NextAuth Tables
export const accounts = mysqlTable('accounts', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('userId', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: int('expires_at'),
  tokenType: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  idToken: text('id_token'),
  sessionState: varchar('session_state', { length: 255 }),
}, (table) => ({
  providerIdx: index('').on(table.provider, table.providerAccountId),
}));

export const sessions = mysqlTable('sessions', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('userId', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
  sessionToken: varchar('sessionToken', { length: 255 }).notNull().unique(),
});

export const verificationTokens = mysqlTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires').notNull(),
});

// MT Accounts Table (MT4/MT5账号绑定)
export const mtAccounts = mysqlTable('mt_accounts', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  broker: varchar('broker', { length: 255 }),
  platform: mysqlEnum('platform', ['MT4', 'MT5']).notNull(),
  isVerified: boolean('is_verified').default(false),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  userUnique: uniqueIndex('uk_user_mt_account').on(table.userId),
  accountUnique: uniqueIndex('uk_mt_account_number').on(table.accountNumber, table.platform),
}));

// Follow Records Table (跟单记录)
export const followRecords = mysqlTable('follow_records', {
  id: int('id').autoincrement().primaryKey(),
  planetId: int('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  signalId: int('signal_id').notNull().references(() => signals.id, { onDelete: 'cascade' }),
  status: mysqlEnum('status', ['active', 'paused', 'closed']).default('active'),
  copyVolume: decimal('copy_volume', { precision: 10, scale: 2 }),
  copyRatio: decimal('copy_ratio', { precision: 5, scale: 2 }).default('1.00'),
  createdAt: timestamp('created_at').defaultNow(),
  pausedAt: timestamp('paused_at'),
  closedAt: timestamp('closed_at'),
}, (table) => ({
  planetUserIdx: index('idx_planet_user_follow').on(table.planetId, table.userId),
  signalIdx: index('idx_signal_follow').on(table.signalId),
}));

// Coin Recharges Table (充值记录)
export const coinRecharges = mysqlTable('coin_recharges', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  amount: int('amount').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }),
  transactionId: varchar('transaction_id', { length: 255 }),
  status: mysqlEnum('status', ['pending', 'completed', 'failed']).default('pending'),
  adminNote: text('admin_note'),
  createdAt: timestamp('created_at').defaultNow(),
  processedAt: timestamp('processed_at'),
}, (table) => ({
  userIdx: index('idx_user_recharge').on(table.userId),
  statusIdx: index('idx_recharge_status').on(table.status),
}));

// EA Products Table (EA产品)
export const eaProducts = mysqlTable('ea_products', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: int('price').notNull(), // 价格（星球币）
  version: varchar('version', { length: 50 }).default('1.0.0'),
  platform: mysqlEnum('platform', ['MT4', 'MT5', 'Both']).default('Both'),
  category: varchar('category', { length: 100 }), // 分类：趋势、震荡、马丁等
  productType: varchar('product_type', { length: 50 }).default('ea'), // 产品类型: ea, indicator, script, tool
  features: text('features'), // 功能特点，JSON格式
  downloadUrl: varchar('download_url', { length: 500 }), // 下载链接
  fileName: varchar('file_name', { length: 255 }), // 文件名
  fileSize: int('file_size'), // 文件大小(KB)
  imageUrl: varchar('image_url', { length: 500 }), // 产品主图
  images: text('images'), // 产品多图，JSON数组格式
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
  creatorId: varchar('creator_id', { length: 255 }), // 创建者ID
  salesCount: int('sales_count').default(0), // 销售数量
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// EA Purchases Table (EA购买记录)
export const eaPurchases = mysqlTable('ea_purchases', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  productId: int('product_id').notNull().references(() => eaProducts.id, { onDelete: 'cascade' }),
  price: int('price').notNull(), // 购买时的价格
  status: mysqlEnum('status', ['completed', 'refunded']).default('completed'),
  purchasedAt: timestamp('purchased_at').defaultNow(),
}, (table) => ({
  userProductUnique: uniqueIndex('uk_user_ea_product').on(table.userId, table.productId),
  userIdx: index('idx_user_ea_purchase').on(table.userId),
  productIdx: index('idx_ea_product_purchase').on(table.productId),
}));

// Documents Table (文档中心)
export const documents = mysqlTable('documents', {
  id: int('id').autoincrement().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }).default('general'), // 分类：getting-started, trading, faq, etc.
  sortOrder: int('sort_order').default(0), // 排序权重
  status: mysqlEnum('status', ['published', 'draft']).default('published'),
  viewCount: int('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  slugUnique: uniqueIndex('uk_document_slug').on(table.slug),
  categoryIdx: index('idx_document_category').on(table.category),
}));

// System Config Table (系统配置)
export const systemConfig = mysqlTable('system_config', {
  id: int('id').autoincrement().primaryKey(),
  configKey: varchar('config_key', { length: 100 }).notNull().unique(),
  configValue: text('config_value').notNull(),
  description: varchar('description', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  keyUnique: uniqueIndex('uk_config_key').on(table.configKey),
}));

// Forum Posts Table (论坛帖子)
export const forumPosts = mysqlTable('forum_posts', {
  id: int('id').autoincrement().primaryKey(),
  planetId: int('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  likeCount: int('like_count').default(0),
  commentCount: int('comment_count').default(0),
  isPinned: boolean('is_pinned').default(false), // 是否置顶
  status: mysqlEnum('status', ['active', 'hidden', 'deleted']).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  planetIdx: index('idx_forum_post_planet').on(table.planetId),
  userIdx: index('idx_forum_post_user').on(table.userId),
  statusIdx: index('idx_forum_post_status').on(table.status),
}));

// Forum Comments Table (论坛评论)
export const forumComments = mysqlTable('forum_comments', {
  id: int('id').autoincrement().primaryKey(),
  postId: int('post_id').notNull().references(() => forumPosts.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  parentId: int('parent_id'), // 回复的评论ID（支持楼中楼）
  likeCount: int('like_count').default(0),
  status: mysqlEnum('status', ['active', 'hidden', 'deleted']).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  postIdx: index('idx_forum_comment_post').on(table.postId),
  userIdx: index('idx_forum_comment_user').on(table.userId),
  parentIdx: index('idx_forum_comment_parent').on(table.parentId),
}));

// Forum Likes Table (论坛点赞)
export const forumLikes = mysqlTable('forum_likes', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  targetType: mysqlEnum('target_type', ['post', 'comment']).notNull(),
  targetId: int('target_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userTargetUnique: uniqueIndex('uk_forum_like_user_target').on(table.userId, table.targetType, table.targetId),
  targetIdx: index('idx_forum_like_target').on(table.targetType, table.targetId),
}));

// Forum Bans Table (论坛禁言)
export const forumBans = mysqlTable('forum_bans', {
  id: int('id').autoincrement().primaryKey(),
  planetId: int('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  bannedBy: varchar('banned_by', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  reason: varchar('reason', { length: 500 }),
  expiresAt: timestamp('expires_at'), // 禁言过期时间（null表示永久）
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  planetUserUnique: uniqueIndex('uk_forum_ban_planet_user').on(table.planetId, table.userId),
  planetIdx: index('idx_forum_ban_planet').on(table.planetId),
}));

// K线征途挑战赛报名表
export const challengeRegistrations = mysqlTable('challenge_registrations', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected', 'active', 'completed', 'failed']).default('pending'), // pending=待审核, approved=已通过待绑定, active=挑战中, completed=已通关, failed=失败, rejected=已拒绝
  currentLevel: int('current_level').default(1), // 当前关卡（1-10）
  completedLevels: text('completed_levels'), // 已完成的关卡，JSON格式存储 [1,2,3...]
  startedAt: timestamp('started_at').defaultNow(), // 开始时间
  completedAt: timestamp('completed_at'), // 完成时间（通关第10关）
  failedAt: timestamp('failed_at'), // 失败时间
  failedLevel: int('failed_level'), // 失败的关卡
  totalDuration: int('total_duration'), // 总耗时（秒）
  // 管理员分配的账户信息
  serverName: varchar('server_name', { length: 255 }), // 服务器名称
  tradingAccount: varchar('trading_account', { length: 50 }), // 交易账号
  tradingPassword: varchar('trading_password', { length: 255 }), // 交易密码（加密存储）
  // 绑定的MT账户ID
  mtAccountId: int('mt_account_id').references(() => mtAccounts.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userActiveUnique: uniqueIndex('uk_challenge_user_active').on(table.userId, table.status),
  userIdx: index('idx_challenge_user').on(table.userId),
  statusIdx: index('idx_challenge_status').on(table.status),
}));

// K线征途配置表
export const challengeConfig = mysqlTable('challenge_config', {
  id: int('id').autoincrement().primaryKey(),
  configKey: varchar('config_key', { length: 100 }).notNull().unique(),
  configValue: text('config_value').notNull(),
  description: varchar('description', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// K线征途关卡配置表
export const challengeLevelConfig = mysqlTable('challenge_level_config', {
  id: int('id').autoincrement().primaryKey(),
  level: int('level').notNull().unique(), // 关卡号（1-10）
  name: varchar('name', { length: 100 }).notNull(), // 关卡名称
  description: text('description'), // 关卡描述
  targetBalance: int('target_balance').notNull().default(2000), // 目标净值
  initialBalance: int('initial_balance').notNull().default(1000), // 初始净值
  failBalance: int('fail_balance').notNull().default(100), // 失败底线净值
  reward: varchar('reward', { length: 255 }), // 奖励描述
  isActive: boolean('is_active').default(true), // 是否启用
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// K线征途名人堂
export const challengeHallOfFame = mysqlTable('challenge_hall_of_fame', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  registrationId: int('registration_id').notNull().references(() => challengeRegistrations.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 255 }).default('匿名用户'), // 显示昵称
  isAnonymous: boolean('is_anonymous').default(false), // 是否匿名
  completedAt: timestamp('completed_at').notNull(), // 通关时间
  totalDuration: int('total_duration').notNull(), // 总耗时（秒）
  rewardClaimed: boolean('reward_claimed').default(false), // 奖励是否已领取
  rewardClaimedAt: timestamp('reward_claimed_at'), // 奖励领取时间
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userUnique: uniqueIndex('uk_hall_user').on(table.userId),
  completedAtIdx: index('idx_hall_completed_at').on(table.completedAt),
}));

// K线征途关卡记录
export const challengeLevelRecords = mysqlTable('challenge_level_records', {
  id: int('id').autoincrement().primaryKey(),
  registrationId: int('registration_id').notNull().references(() => challengeRegistrations.id, { onDelete: 'cascade' }),
  level: int('level').notNull(), // 关卡号（1-10）
  startedAt: timestamp('started_at').defaultNow(), // 开始时间
  completedAt: timestamp('completed_at'), // 完成时间
  duration: int('duration'), // 用时（秒）
  status: mysqlEnum('status', ['active', 'completed', 'failed']).default('active'),
});

export type Signal = typeof signals.$inferSelect;
export type NewSignal = typeof signals.$inferInsert;
export type EaProduct = typeof eaProducts.$inferSelect;
export type NewEaProduct = typeof eaProducts.$inferInsert;
export type EaPurchase = typeof eaPurchases.$inferSelect;
export type NewEaPurchase = typeof eaPurchases.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type NewSystemConfig = typeof systemConfig.$inferInsert;
export type ChallengeRegistration = typeof challengeRegistrations.$inferSelect;
export type NewChallengeRegistration = typeof challengeRegistrations.$inferInsert;
export type ChallengeConfig = typeof challengeConfig.$inferSelect;
export type ChallengeLevelConfig = typeof challengeLevelConfig.$inferSelect;
export type ForumPost = typeof forumPosts.$inferSelect;
export type NewForumPost = typeof forumPosts.$inferInsert;
export type ForumComment = typeof forumComments.$inferSelect;
export type NewForumComment = typeof forumComments.$inferInsert;
export type ForumLike = typeof forumLikes.$inferSelect;
export type NewForumLike = typeof forumLikes.$inferInsert;
export type ForumBan = typeof forumBans.$inferSelect;
export type NewForumBan = typeof forumBans.$inferInsert;

// 赛事配置表
export const tournamentConfig = mysqlTable('tournament_config', {
  id: int('id').autoincrement().primaryKey(),
  tournamentId: varchar('tournament_id', { length: 50 }).notNull().unique(), // 赛事ID，如 'ladder', 'master'
  name: varchar('name', { length: 100 }).notNull(), // 赛事名称
  icon: varchar('icon', { length: 50 }).default('fa-trophy'), // FontAwesome图标
  description: text('description'), // 赛事描述
  details: text('details'), // JSON格式的详情 { label, value }
  reward: varchar('reward', { length: 255 }), // 奖励描述
  badges: text('badges'), // JSON格式的徽章列表
  enabled: boolean('enabled').default(true), // 是否启用
  sortOrder: int('sort_order').default(0), // 排序
  buttonText: varchar('button_text', { length: 50 }).default('立即报名'), // 按钮文字
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  idUnique: uniqueIndex('uk_tournament_id').on(table.tournamentId),
}));

export type TournamentConfig = typeof tournamentConfig.$inferSelect;
export type NewTournamentConfig = typeof tournamentConfig.$inferInsert;

// ============================================================================
// 金火火 - 金融征服系统表
// ============================================================================

// 钱庄表 (5个固定席位)
export const banks = mysqlTable('banks', {
  bankId: varchar('bank_id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  price: decimal('price', { precision: 15, scale: 2 }).notNull(),           // 购买价格
  ownerId: varchar('owner_id', { length: 36 }),                             // 庄主ID
  interestRate: decimal('interest_rate', { precision: 5, scale: 4 }).default('0.005'), // 日利率，默认0.5%
  maxLoan: decimal('max_loan', { precision: 15, scale: 2 }).default('1000000'), // 单次借款上限
  dailyOutput: int('daily_output').default(0),                               // 日产出
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// 借贷记录表
export const bankLoans = mysqlTable('bank_loans', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  bankId: varchar('bank_id', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),           // 当前欠款金额
  lastInterestDate: timestamp('last_interest_date').notNull(),             // 上次计息日期
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userBankIdx: uniqueIndex('uk_user_bank').on(table.userId, table.bankId),
  userIdx: index('idx_loan_user').on(table.userId),
  bankIdx: index('idx_loan_bank').on(table.bankId),
}));

// 交易所表 (3个固定席位)
export const exchanges = mysqlTable('exchanges', {
  exchangeId: varchar('exchange_id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  price: decimal('price', { precision: 15, scale: 2 }).notNull(),           // 购买价格
  ownerId: varchar('owner_id', { length: 36 }),                             // 席主ID
  feeRate: decimal('fee_rate', { precision: 5, scale: 4 }).default('0.002'), // 手续费率，默认0.2%
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
  totalFeeEarned: decimal('total_fee_earned', { precision: 15, scale: 2 }).default('0.00'), // 累计手续费收入
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// 交易手续费记录表
export const exchangeTrades = mysqlTable('exchange_trades', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
  tradeType: mysqlEnum('trade_type', ['challenge', 'conquest', 'shop', 'other']).notNull(),
  tradeId: varchar('trade_id', { length: 100 }),                            // 关联的交易ID
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),         // 交易金额
  fee: decimal('fee', { precision: 15, scale: 2 }).notNull(),              // 手续费
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdx: index('idx_trade_user').on(table.userId),
  exchangeIdx: index('idx_trade_exchange').on(table.exchangeId),
}));

// 土地/部落表
export const lands = mysqlTable('lands', {
  landId: int('land_id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  region: mysqlEnum('region', ['domestic', 'world']).default('domestic'),
  description: text('description'),
  requiredPower: int('required_power').notNull().default(50),              // 征服所需战力
  defense: int('defense').notNull().default(50),                           // 防御值
  dailyOutput: int('daily_output').notNull().default(1000),                // 日产出银两
  upgradeCost: decimal('upgrade_cost', { precision: 15, scale: 2 }).default('50000'), // 升级费用
  upgradeLevel: int('upgrade_level').default(1),                          // 当前等级
  ownerUserId: varchar('owner_user_id', { length: 36 }),                   // 领主ID
  isLocked: boolean('is_locked').default(false),                           // 是否锁定
  conqueredAt: timestamp('conquered_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  ownerIdx: index('idx_land_owner').on(table.ownerUserId),
  regionIdx: index('idx_land_region').on(table.region),
}));

// 武器表 (固定配置)
export const weapons = mysqlTable('weapons', {
  weaponId: varchar('weapon_id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  era: varchar('era', { length: 50 }),                                     // 时代：冷兵器/火药/工业
  description: text('description'),
  cost: decimal('cost', { precision: 15, scale: 2 }).notNull(),           // 研发费用
  powerBonus: int('power_bonus').notNull().default(10),                   // 战力加成
  researchTime: int('research_time').default(0),                          // 研发时间(秒)，0表示即时
  sortOrder: int('sort_order').default(0),                                 // 排序
  createdAt: timestamp('created_at').defaultNow(),
});

// 用户武器研发状态
export const userWeapons = mysqlTable('user_weapons', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  weaponId: varchar('weapon_id', { length: 50 }).notNull(),
  researchedAt: timestamp('researched_at').defaultNow(),
}, (table) => ({
  userWeaponIdx: uniqueIndex('uk_user_weapon').on(table.userId, table.weaponId),
  userIdx: index('idx_user_weapon_user').on(table.userId),
}));

// 军队表
export const userArmy = mysqlTable('user_army', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 36 }).primaryKey().references(() => users.userId, { onDelete: 'cascade' }),
  units: int('units').default(0),                                         // 兵团数量
  lastMaintenanceDate: timestamp('last_maintenance_date').notNull(),      // 上次维护日期
  totalPower: int('total_power').default(0),                              // 总战力
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// 道具表
export const items = mysqlTable('items', {
  itemId: varchar('item_id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  type: mysqlEnum('item_type', ['consumable', 'functional', 'decorative', 'collectible', 'title']).notNull(),
  description: text('description'),
  priceGold: int('price_gold').default(0),                                // 金币价格
  priceSilver: decimal('price_silver', { precision: 15, scale: 2 }).default('0.00'), // 银两价格
  effectType: varchar('effect_type', { length: 50 }),                      // 效果类型
  effectValue: text('effect_value'),                                       // 效果值(JSON)
  icon: varchar('icon', { length: 100 }),                                  // 图标
  isStackable: boolean('is_stackable').default(true),                     // 是否可堆叠
  canTrade: boolean('can_trade').default(false),                           // 是否可交易
  stock: int('stock').default(-1),                                         // 库存，-1表示无限
  sortOrder: int('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// 用户道具背包
export const userItems = mysqlTable('user_items', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  itemId: varchar('item_id', { length: 50 }).notNull(),
  quantity: int('quantity').default(1),
  obtainedAt: timestamp('obtained_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
}, (table) => ({
  userItemIdx: uniqueIndex('uk_user_item').on(table.userId, table.itemId),
  userIdx: index('idx_backpack_user').on(table.userId),
}));

// 称号表
export const titles = mysqlTable('titles', {
  titleId: varchar('title_id', { length: 50 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  rarity: mysqlEnum('rarity', ['common', 'rare', 'epic', 'legendary']).default('common'),
  isUnique: boolean('is_unique').default(false),                          // 是否全服唯一
  createdAt: timestamp('created_at').defaultNow(),
});

// 用户称号
export const userTitles = mysqlTable('user_titles', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  titleId: varchar('title_id', { length: 50 }).notNull(),
  obtainedAt: timestamp('obtained_at').defaultNow(),
  isActive: boolean('is_active').default(false),
}, (table) => ({
  userTitleIdx: uniqueIndex('uk_user_title').on(table.userId, table.titleId),
}));

// 土地股份表 (允许多人持有同一地块股份)
export const landShares = mysqlTable('land_shares', {
  id: int('id').autoincrement().primaryKey(),
  landId: int('land_id').notNull().references(() => lands.landId, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 36 }).notNull(),
  sharePercent: int('share_percent').notNull().default(0),               // 股份百分比
  investedAmount: decimal('invested_amount', { precision: 15, scale: 2 }).default('0.00'), // 投资金额
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  landUserIdx: uniqueIndex('uk_land_user_share').on(table.landId, table.userId),
}));

// ============================================================================
// 类型导出
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Bank = typeof banks.$inferSelect;
export type NewBank = typeof banks.$inferInsert;

export type BankLoan = typeof bankLoans.$inferSelect;
export type NewBankLoan = typeof bankLoans.$inferInsert;

export type Exchange = typeof exchanges.$inferSelect;
export type NewExchange = typeof exchanges.$inferInsert;

export type ExchangeTrade = typeof exchangeTrades.$inferSelect;
export type NewExchangeTrade = typeof exchangeTrades.$inferInsert;

export type Land = typeof lands.$inferSelect;
export type NewLand = typeof lands.$inferInsert;

export type Weapon = typeof weapons.$inferSelect;
export type NewWeapon = typeof weapons.$inferInsert;

export type UserWeapon = typeof userWeapons.$inferSelect;
export type UserArmy = typeof userArmy.$inferSelect;

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;

export type UserItem = typeof userItems.$inferSelect;
export type NewUserItem = typeof userItems.$inferInsert;

export type Title = typeof titles.$inferSelect;
export type UserTitle = typeof userTitles.$inferSelect;

// ==================== 赛事系统表 ====================

// 赛事临时账户表
export const matchAccounts = mysqlTable('match_accounts', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  matchId: varchar('match_id', { length: 50 }).notNull(),           // 赛事唯一标识
  matchType: mysqlEnum('match_type', ['kline', 'ladder', 'master', 'monthly', 'daily']).notNull(),
  initialCapital: decimal('initial_capital', { precision: 15, scale: 2 }).notNull(),
  currentBalance: decimal('current_balance', { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['active', 'completed', 'failed']).default('active'),
  currentLevel: int('current_level').default(1),                  // K线征途关卡
  seasonMonth: varchar('season_month', { length: 7 }).default(''), // 天梯赛赛季月份 YYYY-MM
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userMatchIdx: index('idx_user_match').on(table.userId, table.matchType),
  matchTypeIdx: index('idx_match_type').on(table.matchType, table.status),
}));

// 赛事配置表
export const matchConfigs = mysqlTable('match_configs', {
  id: int('id').autoincrement().primaryKey(),
  matchType: varchar('match_type', { length: 50 }).notNull(),
  configKey: varchar('config_key', { length: 100 }).notNull(),
  configValue: text('config_value'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  uniqueKey: uniqueIndex('uk_match_config').on(table.matchType, table.configKey),
}));

// 赛事记录表
export const matchRecords = mysqlTable('match_records', {
  id: int('id').autoincrement().primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  matchType: varchar('match_type', { length: 50 }).notNull(),
  matchId: varchar('match_id', { length: 50 }).notNull(),
  initialCapital: decimal('initial_capital', { precision: 15, scale: 2 }).notNull(),
  finalBalance: decimal('final_balance', { precision: 15, scale: 2 }).notNull(),
  profit: decimal('profit', { precision: 15, scale: 2 }).notNull(),
  profitRate: decimal('profit_rate', { precision: 10, scale: 4 }).notNull(),
  rank: int('rank'),
  rewardGold: int('reward_gold').default(0),
  rewardSilver: decimal('reward_silver', { precision: 15, scale: 2 }).default('0'),
  completedAt: timestamp('completed_at').defaultNow(),
}, (table) => ({
  userMatchIdx: index('idx_user_match_record').on(table.userId, table.matchType),
  rankIdx: index('idx_match_rank').on(table.matchType, table.matchId, table.rank),
}));

// 导出类型
export type MatchAccount = typeof matchAccounts.$inferSelect;
export type NewMatchAccount = typeof matchAccounts.$inferInsert;

export type MatchConfig = typeof matchConfigs.$inferSelect;
export type NewMatchConfig = typeof matchConfigs.$inferInsert;

export type MatchRecord = typeof matchRecords.$inferSelect;
export type NewMatchRecord = typeof matchRecords.$inferInsert;
