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
  nameUpdatedAt: timestamp('name_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
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
  durationDays: int('duration_days').default(365),
  ownerAsPublisher: boolean('owner_as_publisher').default(false),
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
  price: int('price').notNull(), // 价格（金币）
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
