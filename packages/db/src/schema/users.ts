import {
	boolean,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "administrator"]);

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	email: text("email").notNull().unique(),
	displayName: text("display_name").notNull(),
	passwordHash: text("password_hash").notNull(),
	role: userRole("role").notNull(),
	enabled: boolean("enabled").notNull().default(true),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
