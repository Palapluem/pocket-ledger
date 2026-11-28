import { sql } from "drizzle-orm";
import {
	bigint,
	check,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

import { calendarDate } from "./calendar-date";
import { users } from "./users";

export const accountType = pgEnum("account_type", [
	"CASH",
	"LOAN_GIVEN",
	"LOAN_TAKEN",
	"INCOME",
	"EXPENSE",
]);

export const accounts = pgTable(
	"accounts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: uuid("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		key: text("account_key").notNull(),
		name: text("name").notNull(),
		type: accountType("type").notNull(),
		currency: text("currency").notNull().default("THB"),
		openingAmountSatang: bigint("opening_amount_satang", {
			mode: "bigint",
		})
			.notNull()
			.default(sql`0`),
		openingDate: calendarDate("opening_date"),
		/** D-08: optional per-payment limit in satang; only meaningful for Loan Taken accounts. */
		paymentLimitSatang: bigint("payment_limit_satang", { mode: "bigint" }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		unique().on(table.ownerId, table.key),
		unique("accounts_owner_id_id_unique").on(table.ownerId, table.id),
		check(
			"accounts_opening_amount_nonnegative",
			sql`${table.openingAmountSatang} >= 0`,
		),
		check("accounts_currency_thb", sql`${table.currency} = 'THB'`),
		check(
			"accounts_payment_limit_range",
			sql`${table.paymentLimitSatang} IS NULL OR ${table.paymentLimitSatang} BETWEEN 1 AND 100000000000`,
		),
	],
);

export type AccountRow = typeof accounts.$inferSelect;
