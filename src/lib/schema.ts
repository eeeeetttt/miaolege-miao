import {
  pgTable,
  varchar,
  integer,
  text,
  timestamp,
  bigint,
  decimal,
  pgEnum,
  uniqueIndex,
  index,
  boolean,
  serial,
} from 'drizzle-orm/pg-core';
import { eq, inArray } from 'drizzle-orm';

// Enum definitions
export const roleEnum = pgEnum('role', ['user', 'admin']);
export const statusEnum = pgEnum('status', ['active', 'closed']);
export const memberRoleEnum = pgEnum('member_role', ['owner', 'publisher', 'follower']);
export const joinMethodEnum = pgEnum('join_method', ['purchase', 'invite']);
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'approved', 'rejected']);
export const ticketEnum = pgEnum('ticket_type', ['ticket']);
export const platformEnum = pgEnum('platform', ['MT4', 'MT5']);
export const followStatusEnum = pgEnum('follow_status', ['active', 'paused', 'closed']);
export const rechargeStatusEnum = pgEnum('recharge_status', ['pending', 'completed', 'failed']);
export const eaPlatformEnum = pgEnum('ea_platform', ['MT4', 'MT5', 'Both']);
export const productStatusEnum = pgEnum('product_status', ['active', 'inactive']);
export const purchaseStatusEnum = pgEnum('purchase_status', ['completed', 'refunded']);
export const documentStatusEnum = pgEnum('document_status', ['published', 'draft']);
export const forumStatusEnum = pgEnum('forum_status', ['active', 'hidden', 'deleted']);
export const targetTypeEnum = pgEnum('target_type', ['post', 'comment']);
export const challengeStatusEnum = pgEnum('challenge_status', ['pending', 'approved', 'rejected', 'active', 'completed', 'failed']);
export const levelStatusEnum = pgEnum('level_status', ['active', 'completed', 'failed']);

// Users Table
export const users = pgTable('users', {
  userId: varchar('user_id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).unique(),
  password: varchar('password', { length: 255 }),
  name: varchar('name', { length: 255 }),
  avatar: varchar('avatar', { length: 500 }),
  coinBalance: integer('coin_balance').default(0),
  role: roleEnum('role').default('user'),
  nameUpdatedAt: timestamp('name_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Planets Table
export const planets = pgTable('planets', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  rules: text('rules'),
  creatorId: varchar('creator_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  coins: integer('coins').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  ticketPrice: integer('ticket_price').default(0),
  inviteCode: varchar('invite_code', { length: 50 }),
  maxPublishers: integer('max_publishers').default(3),
  status: statusEnum('status').default('active'),
  durationDays: integer('duration_days').default(365),
  expireAt: timestamp('expire_at'),
  ownerAsPublisher: boolean('owner_as_publisher').default(false),
  forumEnabled: boolean('forum_enabled').default(false),
});

// Planet Members Table
export const planetMembers = pgTable('planet_members', {
  id: serial('id').primaryKey(),
  planetId: integer('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  role: memberRoleEnum('role').notNull(),
  joinMethod: joinMethodEnum('join_method').default('purchase'),
  ticketPaid: integer('ticket_paid').default(0),
  joinedAt: timestamp('joined_at').defaultNow(),
  expiryDate: timestamp('expiry_date'),
}, (table) => ({
  planetUserUnique: uniqueIndex('uk_planet_user').on(table.planetId, table.userId),
}));

// Planet Applications Table
export const planetApplications = pgTable('planet_applications', {
  id: serial('id').primaryKey(),
  planetId: integer('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  status: applicationStatusEnum('status').default('pending'),
  appliedAt: timestamp('applied_at').defaultNow(),
  handledAt: timestamp('handled_at'),
}, (table) => ({
  planetUserAppUnique: uniqueIndex('uk_planet_user_app').on(table.planetId, table.userId),
}));

// Planet Earnings Table
export const planetEarnings = pgTable('planet_earnings', {
  id: serial('id').primaryKey(),
  planetId: integer('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  type: ticketEnum('type').default('ticket'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Signals Table
export const signals = pgTable('signals', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
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
  planetId: integer('planet_id').references(() => planets.id, { onDelete: 'set null' }),
}, (table) => ({
  senderAccountIdx: index('idx_sender_account').on(table.senderAccount),
  planetIdx: index('idx_planet').on(table.planetId),
}));

// NextAuth Tables
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
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
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: varchar('userId', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
  sessionToken: varchar('sessionToken', { length: 255 }).notNull().unique(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires: timestamp('expires').notNull(),
});

// MT Accounts Table
export const mtAccounts = pgTable('mt_accounts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  broker: varchar('broker', { length: 255 }),
  platform: platformEnum('platform').notNull(),
  isVerified: boolean('is_verified').default(false),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userUnique: uniqueIndex('uk_user_mt_account').on(table.userId),
  accountUnique: uniqueIndex('uk_mt_account_number').on(table.accountNumber, table.platform),
}));

// Follow Records Table
export const followRecords = pgTable('follow_records', {
  id: serial('id').primaryKey(),
  planetId: integer('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  signalId: bigint('signal_id', { mode: 'number' }).notNull().references(() => signals.id, { onDelete: 'cascade' }),
  status: followStatusEnum('status').default('active'),
  copyVolume: decimal('copy_volume', { precision: 10, scale: 2 }),
  copyRatio: decimal('copy_ratio', { precision: 5, scale: 2 }).default('1.00'),
  createdAt: timestamp('created_at').defaultNow(),
  pausedAt: timestamp('paused_at'),
  closedAt: timestamp('closed_at'),
}, (table) => ({
  planetUserIdx: index('idx_planet_user_follow').on(table.planetId, table.userId),
  signalIdx: index('idx_signal_follow').on(table.signalId),
}));

// Coin Recharges Table
export const coinRecharges = pgTable('coin_recharges', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }),
  transactionId: varchar('transaction_id', { length: 255 }),
  status: rechargeStatusEnum('status').default('pending'),
  adminNote: text('admin_note'),
  createdAt: timestamp('created_at').defaultNow(),
  processedAt: timestamp('processed_at'),
}, (table) => ({
  userIdx: index('idx_user_recharge').on(table.userId),
  statusIdx: index('idx_recharge_status').on(table.status),
}));

// EA Products Table
export const eaProducts = pgTable('ea_products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: integer('price').notNull(),
  version: varchar('version', { length: 50 }).default('1.0.0'),
  platform: eaPlatformEnum('platform').default('Both'),
  category: varchar('category', { length: 100 }),
  features: text('features'),
  downloadUrl: varchar('download_url', { length: 500 }),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'),
  imageUrl: varchar('image_url', { length: 500 }),
  status: productStatusEnum('status').default('active'),
  salesCount: integer('sales_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// EA Purchases Table
export const eaPurchases = pgTable('ea_purchases', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => eaProducts.id, { onDelete: 'cascade' }),
  price: integer('price').notNull(),
  status: purchaseStatusEnum('status').default('completed'),
  purchasedAt: timestamp('purchased_at').defaultNow(),
}, (table) => ({
  userProductUnique: uniqueIndex('uk_user_ea_product').on(table.userId, table.productId),
  userIdx: index('idx_user_ea_purchase').on(table.userId),
  productIdx: index('idx_ea_product_purchase').on(table.productId),
}));

// Documents Table
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content').notNull(),
  category: varchar('category', { length: 100 }).default('general'),
  sortOrder: integer('sort_order').default(0),
  status: documentStatusEnum('status').default('published'),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  slugUnique: uniqueIndex('uk_document_slug').on(table.slug),
  categoryIdx: index('idx_document_category').on(table.category),
}));

// System Config Table
export const systemConfig = pgTable('system_config', {
  id: serial('id').primaryKey(),
  configKey: varchar('config_key', { length: 100 }).notNull().unique(),
  configValue: text('config_value').notNull(),
  description: varchar('description', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  keyUnique: uniqueIndex('uk_config_key').on(table.configKey),
}));

// Forum Posts Table
export const forumPosts = pgTable('forum_posts', {
  id: serial('id').primaryKey(),
  planetId: integer('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  likeCount: integer('like_count').default(0),
  commentCount: integer('comment_count').default(0),
  isPinned: boolean('is_pinned').default(false),
  status: forumStatusEnum('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  planetIdx: index('idx_forum_post_planet').on(table.planetId),
  userIdx: index('idx_forum_post_user').on(table.userId),
  statusIdx: index('idx_forum_post_status').on(table.status),
}));

// Forum Comments Table
export const forumComments = pgTable('forum_comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => forumPosts.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  parentId: integer('parent_id'),
  likeCount: integer('like_count').default(0),
  status: forumStatusEnum('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  postIdx: index('idx_forum_comment_post').on(table.postId),
  userIdx: index('idx_forum_comment_user').on(table.userId),
  parentIdx: index('idx_forum_comment_parent').on(table.parentId),
}));

// Forum Likes Table
export const forumLikes = pgTable('forum_likes', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  targetType: targetTypeEnum('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userTargetUnique: uniqueIndex('uk_forum_like_user_target').on(table.userId, table.targetType, table.targetId),
  targetIdx: index('idx_forum_like_target').on(table.targetType, table.targetId),
}));

// Forum Bans Table
export const forumBans = pgTable('forum_bans', {
  id: serial('id').primaryKey(),
  planetId: integer('planet_id').notNull().references(() => planets.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  bannedBy: varchar('banned_by', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  reason: varchar('reason', { length: 500 }),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  planetUserUnique: uniqueIndex('uk_forum_ban_planet_user').on(table.planetId, table.userId),
  planetIdx: index('idx_forum_ban_planet').on(table.planetId),
}));

// Challenge Registrations Table
export const challengeRegistrations = pgTable('challenge_registrations', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  status: challengeStatusEnum('status').default('pending'),
  currentLevel: integer('current_level').default(1),
  completedLevels: text('completed_levels'),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  failedAt: timestamp('failed_at'),
  failedLevel: integer('failed_level'),
  totalDuration: integer('total_duration'),
  serverName: varchar('server_name', { length: 255 }),
  tradingAccount: varchar('trading_account', { length: 50 }),
  tradingPassword: varchar('trading_password', { length: 255 }),
  mtAccountId: integer('mt_account_id').references(() => mtAccounts.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userActiveUnique: uniqueIndex('uk_challenge_user_active').on(table.userId, table.status),
  userIdx: index('idx_challenge_user').on(table.userId),
  statusIdx: index('idx_challenge_status').on(table.status),
}));

// Challenge Config Table
export const challengeConfig = pgTable('challenge_config', {
  id: serial('id').primaryKey(),
  configKey: varchar('config_key', { length: 100 }).notNull().unique(),
  configValue: text('config_value').notNull(),
  description: varchar('description', { length: 255 }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Challenge Level Config Table
export const challengeLevelConfig = pgTable('challenge_level_config', {
  id: serial('id').primaryKey(),
  level: integer('level').notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  targetBalance: integer('target_balance').notNull().default(2000),
  initialBalance: integer('initial_balance').notNull().default(1000),
  failBalance: integer('fail_balance').notNull().default(100),
  reward: varchar('reward', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Challenge Hall of Fame Table
export const challengeHallOfFame = pgTable('challenge_hall_of_fame', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.userId, { onDelete: 'cascade' }),
  registrationId: integer('registration_id').notNull().references(() => challengeRegistrations.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 255 }).default('匿名用户'),
  isAnonymous: boolean('is_anonymous').default(false),
  completedAt: timestamp('completed_at').notNull(),
  totalDuration: integer('total_duration').notNull(),
  rewardClaimed: boolean('reward_claimed').default(false),
  rewardClaimedAt: timestamp('reward_claimed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userUnique: uniqueIndex('uk_hall_user').on(table.userId),
  completedAtIdx: index('idx_hall_completed_at').on(table.completedAt),
}));

// Challenge Level Records Table
export const challengeLevelRecords = pgTable('challenge_level_records', {
  id: serial('id').primaryKey(),
  registrationId: integer('registration_id').notNull().references(() => challengeRegistrations.id, { onDelete: 'cascade' }),
  level: integer('level').notNull(),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'),
  status: levelStatusEnum('status').default('active'),
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
