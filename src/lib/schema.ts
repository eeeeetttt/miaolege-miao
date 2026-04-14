import {
  mysqlTable,
  varchar,
  int,
  text,
  timestamp,
  bigint,
  decimal,
  mysqlEnum,
  uniqueIndex,
  index,
  boolean,
} from 'drizzle-orm/mysql-core';

// Users Table
export const users = mysqlTable('users', {
  userId: varchar('user_id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).unique(),
  password: varchar('password', { length: 255 }),
  name: varchar('name', { length: 255 }),
  avatar: varchar('avatar', { length: 500 }),
  coinBalance: int('coin_balance').default(0),
  role: mysqlEnum('role', ['user', 'admin']).default('user'), // 用户角色
  nameUpdatedAt: timestamp('name_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  // 银行卡信息
  bankName: varchar('bank_name', { length: 255 }),
  bankCardNumber: varchar('bank_card_number', { length: 50 }),
  bankCardName: varchar('bank_card_name', { length: 100 }),
  // 钱包地址
  walletAddress: varchar('wallet_address', { length: 255 }),
});

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
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
  senderAccount: varchar('sender_account', { length: 255 }).notNull(),
  signalType: varchar('signal_type', { length: 50 }).notNull(),
  ticket: bigint('ticket', { mode: 'number' }),
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
  expiresAt: bigint('expires_at', { mode: 'number' }),
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
  signalId: bigint('signal_id', { mode: 'number' }).notNull().references(() => signals.id, { onDelete: 'cascade' }),
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
  features: text('features'), // 功能特点，JSON格式
  downloadUrl: varchar('download_url', { length: 500 }), // 下载链接
  fileName: varchar('file_name', { length: 255 }), // 文件名
  fileSize: int('file_size'), // 文件大小(KB)
  imageUrl: varchar('image_url', { length: 500 }), // 产品图片
  status: mysqlEnum('status', ['active', 'inactive']).default('active'),
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

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Planet = typeof planets.$inferSelect;
export type NewPlanet = typeof planets.$inferInsert;
export type PlanetMember = typeof planetMembers.$inferSelect;
export type NewPlanetMember = typeof planetMembers.$inferInsert;
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
