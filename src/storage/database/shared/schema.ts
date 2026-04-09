import { pgTable, serial, timestamp, index, varchar, numeric, pgPolicy, integer, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const mtAccountEquity = pgTable("mt_account_equity", {
	id: serial().primaryKey().notNull(),
	accountNumber: varchar("account_number", { length: 50 }).notNull(),
	equity: numeric({ precision: 15, scale:  2 }).default('0').notNull(),
	balance: numeric({ precision: 15, scale:  2 }).default('0').notNull(),
	profit: numeric({ precision: 15, scale:  2 }).default('0').notNull(),
	recordedAt: timestamp("recorded_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_equity_account").using("btree", table.accountNumber.asc().nullsLast().op("text_ops")),
	index("idx_equity_recorded").using("btree", table.recordedAt.desc().nullsFirst().op("timestamp_ops")),
]);

export const challengeRegistrations = pgTable("challenge_registrations", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	currentLevel: integer("current_level").default(1),
	completedLevels: jsonb("completed_levels").default([]),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	failedAt: timestamp("failed_at", { withTimezone: true, mode: 'string' }),
	failedLevel: integer("failed_level"),
	totalDuration: integer("total_duration"),
	serverName: varchar("server_name", { length: 255 }),
	tradingAccount: varchar("trading_account", { length: 50 }),
	tradingPassword: varchar("trading_password", { length: 255 }),
	mtAccountId: integer("mt_account_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_challenge_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_challenge_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	pgPolicy("challenge_registrations_允许公开删除", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
	pgPolicy("challenge_registrations_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("challenge_registrations_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("challenge_registrations_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

// 私信表
export const privateMessages = pgTable("private_messages", {
	id: serial().primaryKey().notNull(),
	senderId: varchar("sender_id", { length: 255 }).notNull(),
	receiverId: varchar("receiver_id", { length: 255 }).notNull(),
	content: varchar("content", { length: 2000 }).notNull(),
	isRead: integer("is_read").default(0).notNull(),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_pm_sender_id").using("btree", table.senderId.asc().nullsLast().op("text_ops")),
	index("idx_pm_receiver_id").using("btree", table.receiverId.asc().nullsLast().op("text_ops")),
	index("idx_pm_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_pm_conversation").using("btree", table.senderId.asc().nullsLast().op("text_ops"), table.receiverId.asc().nullsLast().op("text_ops")),
	pgPolicy("private_messages_允许公开读取", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("private_messages_允许公开写入", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`true` }),
	pgPolicy("private_messages_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("private_messages_允许公开删除", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
]);

// 星球币转账记录表
export const coinTransfers = pgTable("coin_transfers", {
	id: serial().primaryKey().notNull(),
	fromUserId: varchar("from_user_id", { length: 255 }).notNull(),
	toUserId: varchar("to_user_id", { length: 255 }).notNull(),
	amount: integer("amount").notNull(),
	remark: varchar("remark", { length: 255 }),
	status: varchar("status", { length: 20 }).default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_ct_from_user_id").using("btree", table.fromUserId.asc().nullsLast().op("text_ops")),
	index("idx_ct_to_user_id").using("btree", table.toUserId.asc().nullsLast().op("text_ops")),
	index("idx_ct_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	pgPolicy("coin_transfers_允许公开读取", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("coin_transfers_允许公开写入", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`true` }),
	pgPolicy("coin_transfers_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("coin_transfers_允许公开删除", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
]);

// 用户关注表
export const userFollows = pgTable("user_follows", {
	id: serial().primaryKey().notNull(),
	followerId: varchar("follower_id", { length: 255 }).notNull(),
	followedId: varchar("followed_id", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_uf_follower_id").using("btree", table.followerId.asc().nullsLast().op("text_ops")),
	index("idx_uf_followed_id").using("btree", table.followedId.asc().nullsLast().op("text_ops")),
	index("idx_uf_unique").using("btree", table.followerId.asc().nullsLast().op("text_ops"), table.followedId.asc().nullsLast().op("text_ops")),
	pgPolicy("user_follows_允许公开读取", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("user_follows_允许公开写入", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`true` }),
	pgPolicy("user_follows_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("user_follows_允许公开删除", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
]);
