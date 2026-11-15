import { sql } from "drizzle-orm";
import {
	bigint,
	check,
	date,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/** The five Theme 7 account types (System SDS data model). */
export const accountType = pgEnum("account_type", [
	"CASH",
	"LOAN_TAKEN",
	"LOAN_GIVEN",
	"INCOME",
	"EXPENSE",
]);
export const transactionForm = pgEnum("transaction_form", [
	"PAYMENT",
	"RECEIVE",
]);

/** Money is THB in integer satang (D-03). Balances are derived, never stored. */
export const financialAccounts = pgTable(
	"financial_accounts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: uuid("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		type: accountType("type").notNull(),
		currency: text("currency").notNull().default("THB"),
		openingAmountMinor: bigint("opening_amount_minor", { mode: "bigint" })
			.notNull()
			.default(sql`0`),
		openingDate: date("opening_date", { mode: "string" }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		unique("financial_accounts_owner_name").on(t.ownerId, t.name),
		check(
			"financial_accounts_opening_non_negative",
			sql`${t.openingAmountMinor} >= 0`,
		),
		check("financial_accounts_currency_thb", sql`${t.currency} = 'THB'`),
	],
);

export const financialTransactions = pgTable(
	"financial_transactions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: uuid("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		form: transactionForm("form").notNull(),
		primaryAccountId: uuid("primary_account_id")
			.notNull()
			.references(() => financialAccounts.id, { onDelete: "cascade" }),
		date: date("date", { mode: "string" }).notNull(),
		totalMinor: bigint("total_minor", { mode: "bigint" }).notNull(),
		memo: text("memo"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		check("financial_transactions_total_positive", sql`${t.totalMinor} > 0`),
		index("financial_transactions_owner_date").on(t.ownerId, t.date),
	],
);

export const allocationLines = pgTable(
	"allocation_lines",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		transactionId: uuid("transaction_id")
			.notNull()
			.references(() => financialTransactions.id, { onDelete: "cascade" }),
		accountId: uuid("account_id")
			.notNull()
			.references(() => financialAccounts.id, { onDelete: "cascade" }),
		amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
		position: integer("position").notNull(),
	},
	(t) => [
		check("allocation_lines_amount_positive", sql`${t.amountMinor} > 0`),
		unique("allocation_lines_transaction_account").on(
			t.transactionId,
			t.accountId,
		),
		unique("allocation_lines_transaction_position").on(
			t.transactionId,
			t.position,
		),
		index("allocation_lines_account").on(t.accountId),
	],
);

export type AccountType = (typeof accountType.enumValues)[number];
export type TransactionForm = (typeof transactionForm.enumValues)[number];
export type FinancialAccountRow = typeof financialAccounts.$inferSelect;
