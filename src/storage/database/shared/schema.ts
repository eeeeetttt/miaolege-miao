import { pgTable, serial, timestamp, index, pgPolicy, varchar, integer, numeric, unique, text, boolean, uniqueIndex, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const rechargeApplications = pgTable("recharge_applications", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	amount: integer().notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	screenshotUrl: varchar("screenshot_url", { length: 500 }),
	adminNote: varchar("admin_note", { length: 500 }),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	paymentMethod: varchar("payment_method", { length: 50 }).default('crypto'),
	cnyAmount: integer("cny_amount").default(0),
	exchangeRate: numeric("exchange_rate", { precision: 10, scale:  2 }).default('7.0'),
}, (table) => [
	index("idx_recharge_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_recharge_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	pgPolicy("recharge_applications_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("recharge_applications_允许公开插入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("recharge_applications_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const suggestionLikes = pgTable("suggestion_likes", {
	id: serial().primaryKey().notNull(),
	suggestionId: integer("suggestion_id").notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("suggestion_likes_unique").on(table.suggestionId, table.userId),
	pgPolicy("suggestion_likes_允许公开删除", { as: "permissive", for: "delete", to: ["public"] }),
	pgPolicy("suggestion_likes_允许公开插入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("suggestion_likes_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const userComplaints = pgTable("user_complaints", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	content: varchar({ length: 2000 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	adminReply: varchar("admin_reply", { length: 2000 }),
	repliedAt: timestamp("replied_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_complaint_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_complaint_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	pgPolicy("user_complaints_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("user_complaints_允许公开插入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("user_complaints_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const userSuggestions = pgTable("user_suggestions", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	content: varchar({ length: 2000 }).notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	likeCount: integer("like_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_suggestion_like_count").using("btree", table.likeCount.asc().nullsLast().op("int4_ops")),
	index("idx_suggestion_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_suggestion_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	pgPolicy("user_suggestions_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("user_suggestions_允许公开插入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("user_suggestions_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

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

export const systemConfig = pgTable("system_config", {
	id: serial().primaryKey().notNull(),
	configKey: varchar("config_key", { length: 100 }).notNull(),
	configValue: text("config_value").notNull(),
	description: varchar({ length: 255 }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("system_config_config_key_key").on(table.configKey),
]);

export const eaPurchases = pgTable("ea_purchases", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	productId: integer("product_id").notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	status: varchar({ length: 50 }).default('completed'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const users = pgTable("users", {
	userId: varchar("user_id", { length: 255 }).primaryKey().notNull(),
	email: varchar({ length: 255 }),
	password: varchar({ length: 255 }),
	name: varchar({ length: 255 }),
	avatar: varchar({ length: 500 }),
	coinBalance: integer("coin_balance").default(0),
	role: varchar({ length: 50 }).default('user'),
	nameUpdatedAt: timestamp("name_updated_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_users_role").using("btree", table.role.asc().nullsLast().op("text_ops")),
	unique("users_email_key").on(table.email),
]);

export const chatHallAiRoles = pgTable("chat_hall_ai_roles", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }).default('店小二').notNull(),
	enabled: boolean().default(true),
	replyProbability: integer("reply_probability").default(50),
	maxResponseLength: integer("max_response_length").default(200),
	systemPrompt: text("system_prompt").default('你是金火火茶馆的店小二，为来往的客人服务。性格热情好客，说话简洁友好。'),
	triggerKeyword: varchar("trigger_keyword", { length: 100 }).default(''),
	avatarUrl: varchar("avatar_url", { length: 500 }).default(''),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	pgPolicy("allow_all_chat_hall_ai_roles", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const dailyNews = pgTable("daily_news", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	author: varchar({ length: 100 }).default('金查理'),
	newsDate: date("news_date").notNull(),
	published: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	uniqueIndex("daily_news_date_idx").using("btree", table.newsDate.asc().nullsLast().op("date_ops")),
	pgPolicy("daily_news_允许管理员更新删除", { as: "permissive", for: "update", to: ["authenticated"], using: sql`true` }),
	pgPolicy("daily_news_允许管理员插入更新", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("daily_news_允许公开读取已发布文章", { as: "permissive", for: "select", to: ["public"] }),
]);

export const mtAccounts = pgTable("mt_accounts", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	challengeType: varchar("challenge_type", { length: 50 }),
	server: varchar({ length: 255 }),
	account: varchar({ length: 255 }),
	password: varchar({ length: 255 }),
	status: varchar({ length: 20 }).default('pending'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});
