import { pgTable, serial, timestamp, varchar, integer, boolean, text, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// K线征途挑战赛报名表
export const challengeRegistrations = pgTable("challenge_registrations", {
	id: serial().primaryKey(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	status: varchar("status", { length: 20 }).default('pending').notNull(), // pending/approved/rejected/active/completed/failed
	currentLevel: integer("current_level").default(1),
	completedLevels: jsonb("completed_levels").default(sql`'[]'::jsonb`),
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
});
