import { pgTable, serial, timestamp, index, varchar, numeric, pgPolicy, integer, jsonb, unique } from "drizzle-orm/pg-core"
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

export const userFollows = pgTable("user_follows", {
	id: serial().primaryKey().notNull(),
	followerId: varchar("follower_id", { length: 255 }).notNull(),
	followedId: varchar("followed_id", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const challengeAnnouncement = pgTable("challenge_announcement", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 200 }).default('公告').notNull(),
	content: varchar({ length: 2000 }).notNull(),
	isActive: integer("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("challenge_announcement_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("challenge_announcement_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const coinTransfers = pgTable("coin_transfers", {
	id: serial().primaryKey().notNull(),
	fromUserId: varchar("from_user_id", { length: 255 }).notNull(),
	toUserId: varchar("to_user_id", { length: 255 }).notNull(),
	amount: integer().notNull(),
	remark: varchar({ length: 255 }),
	status: varchar({ length: 20 }).default('pending').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_ct_from_user_id").using("btree", table.fromUserId.asc().nullsLast().op("text_ops")),
	index("idx_ct_to_user_id").using("btree", table.toUserId.asc().nullsLast().op("text_ops")),
]);

export const privateMessages = pgTable("private_messages", {
	id: serial().primaryKey().notNull(),
	senderId: varchar("sender_id", { length: 255 }).notNull(),
	receiverId: varchar("receiver_id", { length: 255 }).notNull(),
	content: varchar({ length: 2000 }).notNull(),
	isRead: integer("is_read").default(0).notNull(),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const challengeConfig = pgTable("challenge_config", {
	id: serial().primaryKey().notNull(),
	configKey: varchar("config_key", { length: 100 }).notNull(),
	configValue: varchar("config_value", { length: 2000 }),
	description: varchar({ length: 500 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_challenge_config_key").using("btree", table.configKey.asc().nullsLast().op("text_ops")),
	unique("challenge_config_config_key_unique").on(table.configKey),
	pgPolicy("challenge_config_允许公开插入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("challenge_config_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("challenge_config_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const challengeLevelConfig = pgTable("challenge_level_config", {
	id: serial().primaryKey().notNull(),
	level: integer().notNull(),
	name: varchar({ length: 50 }).notNull(),
	description: varchar({ length: 500 }),
	targetBalance: numeric("target_balance", { precision: 15, scale:  2 }).default('2000').notNull(),
	initialBalance: numeric("initial_balance", { precision: 15, scale:  2 }).default('1000').notNull(),
	failBalance: numeric("fail_balance", { precision: 15, scale:  2 }).default('100').notNull(),
	reward: varchar({ length: 200 }),
	isActive: integer("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_challenge_level_num").using("btree", table.level.asc().nullsLast().op("int4_ops")),
	unique("challenge_level_config_level_unique").on(table.level),
	pgPolicy("allow_all_update", { as: "permissive", for: "update", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("allow_all_insert", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("allow_all_select", { as: "permissive", for: "select", to: ["public"] }),
]);

// 充值申请表
export const rechargeApplications = pgTable("recharge_applications", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	amount: integer().notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(), // pending, completed, rejected
	screenshotUrl: varchar("screenshot_url", { length: 500 }),
	adminNote: varchar("admin_note", { length: 500 }),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_recharge_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("idx_recharge_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	pgPolicy("recharge_applications_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("recharge_applications_允许公开插入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("recharge_applications_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
]);

// 用户投诉表
export const userComplaints = pgTable("user_complaints", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: varchar({ length: 2000 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(), // pending, replied, closed
	adminReply: varchar("admin_reply", { length: 2000 }),
	repliedAt: timestamp("replied_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_complaint_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("idx_complaint_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	pgPolicy("user_complaints_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("user_complaints_允许公开插入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("user_complaints_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
]);

// 用户建议表
export const userSuggestions = pgTable("user_suggestions", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	content: varchar({ length: 2000 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(), // pending, approved, rejected
	likeCount: integer("like_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_suggestion_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("idx_suggestion_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_suggestion_like_count").using("btree", table.likeCount.desc().nullsLast().op("int4_ops")),
	pgPolicy("user_suggestions_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("user_suggestions_允许公开插入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("user_suggestions_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
]);

// 建议点赞表
export const suggestionLikes = pgTable("suggestion_likes", {
	id: serial().primaryKey().notNull(),
	suggestionId: integer("suggestion_id").notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("suggestion_likes_unique").on(table.suggestionId, table.userId),
	pgPolicy("suggestion_likes_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("suggestion_likes_允许公开插入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("suggestion_likes_允许公开删除", { as: "permissive", for: "delete", to: ["public"] }),
]);

// 后台管理导航配置表
export const adminNavConfig = pgTable("admin_nav_config", {
	id: serial().primaryKey().notNull(),
	navKey: varchar("nav_key", { length: 50 }).notNull().unique(),
	navName: varchar("nav_name", { length: 100 }).notNull(),
	isVisible: integer("is_visible").default(1).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("admin_nav_config_key_unique").on(table.navKey),
	pgPolicy("admin_nav_config_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("admin_nav_config_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
]);
