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
} from 'drizzle-orm/mysql-core';

// Users Table
export const users = mysqlTable('users', {
  userId: varchar('user_id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).unique(),
  password: varchar('password', { length: 255 }),
  name: varchar('name', { length: 255 }),
  coinBalance: int('coin_balance').default(0),
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

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Planet = typeof planets.$inferSelect;
export type NewPlanet = typeof planets.$inferInsert;
export type PlanetMember = typeof planetMembers.$inferSelect;
export type NewPlanetMember = typeof planetMembers.$inferInsert;
export type Signal = typeof signals.$inferSelect;
export type NewSignal = typeof signals.$inferInsert;
