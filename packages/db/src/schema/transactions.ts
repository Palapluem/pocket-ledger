import { sql } from "drizzle-orm";
import {
	bigint,
	check,
	foreignKey,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { calendarDate } from "./calendar-date";
import { users } from "./users";

export const transactionForm = pgEnum("transaction_form", [
	"PAYMENT",
	"RECEIVE",
]);

export const transactions = pgTable(
	"transactions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: uuid("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		form: transactionForm("form").notNull(),
		primaryAccountId: uuid("primary_account_id").notNull(),
		occurredOn: calendarDate("occurred_on").notNull(),
		totalSatang: bigint("total_satang", { mode: "bigint" }).notNull(),
		memo: text("memo"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		unique("transactions_owner_id_id_unique").on(table.ownerId, table.id),
		index("transactions_owner_date_id_idx").on(
			table.ownerId,
			table.occurredOn,
			table.id,
		),
		check("transactions_total_positive", sql`${table.totalSatang} > 0`),
		check("transactions_total_max", sql`${table.totalSatang} <= 100000000000`),
		foreignKey({
			name: "transactions_owner_primary_account_fk",
			columns: [table.ownerId, table.primaryAccountId],
			foreignColumns: [accounts.ownerId, accounts.id],
		}).onDelete("no action"),
	],
);

export const transactionAllocations = pgTable(
	"transaction_allocations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ownerId: uuid("owner_id").notNull(),
		transactionId: uuid("transaction_id").notNull(),
		accountId: uuid("account_id").notNull(),
		amountSatang: bigint("amount_satang", { mode: "bigint" }).notNull(),
		position: integer("position").notNull(),
	},
	(table) => [
		unique("transaction_allocations_transaction_account_unique").on(
			table.transactionId,
			table.accountId,
		),
		index("transaction_allocations_transaction_position_idx").on(
			table.transactionId,
			table.position,
		),
		check(
			"transaction_allocations_amount_positive",
			sql`${table.amountSatang} > 0`,
		),
		check(
			"transaction_allocations_amount_max",
			sql`${table.amountSatang} <= 100000000000`,
		),
		foreignKey({
			name: "transaction_allocations_owner_transaction_fk",
			columns: [table.ownerId, table.transactionId],
			foreignColumns: [transactions.ownerId, transactions.id],
		}).onDelete("cascade"),
		foreignKey({
			name: "transaction_allocations_owner_account_fk",
			columns: [table.ownerId, table.accountId],
			foreignColumns: [accounts.ownerId, accounts.id],
		}).onDelete("no action"),
	],
);

export type TransactionRow = typeof transactions.$inferSelect;
export type TransactionAllocationRow =
	typeof transactionAllocations.$inferSelect;
