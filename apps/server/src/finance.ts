import type { Database } from "@pocket-ledger/db";
import { type AccountType, schema } from "@pocket-ledger/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Elysia } from "elysia";

import {
	allocationEffect,
	bangkokToday,
	deriveBalances,
	formatAmount,
	isBalanceAccount,
	isCalendarDate,
	type LedgerTransaction,
	parseAmount,
	primaryEffect,
} from "./money";

type Identity = { id: string; displayName: string; role: string };
type Failure = (status: number, code: string, message: string) => Response;
type Query = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

const { financialAccounts: accounts, financialTransactions: txns } = schema;
const lines = schema.allocationLines;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPE_ORDER: AccountType[] = [
	"CASH",
	"LOAN_TAKEN",
	"LOAN_GIVEN",
	"INCOME",
	"EXPENSE",
];
const MAX_LINES = 50;
const MAX_MEMO = 200;

/** A domain rejection: thrown inside the database transaction so nothing is written. */
class Rejection extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
	}
}

type AccountRow = typeof accounts.$inferSelect;
type TransactionRow = typeof txns.$inferSelect;
type LineRow = typeof lines.$inferSelect;

/** Every account and transaction of one owner; scoped before any calculation. */
async function loadLedger(q: Query, ownerId: string) {
	const accountRows = await q
		.select()
		.from(accounts)
		.where(eq(accounts.ownerId, ownerId));
	const transactionRows = await q
		.select()
		.from(txns)
		.where(eq(txns.ownerId, ownerId))
		.orderBy(desc(txns.date), desc(txns.createdAt), desc(txns.id));
	const lineRows = transactionRows.length
		? await q
				.select()
				.from(lines)
				.where(
					inArray(
						lines.transactionId,
						transactionRows.map((t) => t.id),
					),
				)
				.orderBy(asc(lines.position))
		: [];
	const linesByTransaction = new Map<string, LineRow[]>();
	for (const line of lineRows) {
		const list = linesByTransaction.get(line.transactionId) ?? [];
		list.push(line);
		linesByTransaction.set(line.transactionId, list);
	}
	const transactions = transactionRows.map((t) => ({
		...t,
		lines: linesByTransaction.get(t.id) ?? [],
	}));
	return { accounts: accountRows, transactions };
}

const asLedger = (
	t: TransactionRow & { lines: LineRow[] },
): LedgerTransaction => ({
	form: t.form,
	primaryAccountId: t.primaryAccountId,
	totalMinor: t.totalMinor,
	allocations: t.lines.map((l) => ({
		accountId: l.accountId,
		amountMinor: l.amountMinor,
	})),
});

const transactionDto = (t: TransactionRow & { lines: LineRow[] }) => ({
	id: t.id,
	form: t.form,
	primaryAccountId: t.primaryAccountId,
	date: t.date,
	total: formatAmount(t.totalMinor),
	memo: t.memo,
	createdAt: t.createdAt.toISOString(),
	allocations: t.lines.map((l) => ({
		accountId: l.accountId,
		amount: formatAmount(l.amountMinor),
	})),
});

function accountDtos(ledger: Awaited<ReturnType<typeof loadLedger>>) {
	const balances = deriveBalances(
		ledger.accounts,
		ledger.transactions.map(asLedger),
	);
	return [...ledger.accounts]
		.sort(
			(a, b) =>
				TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
				a.name.localeCompare(b.name),
		)
		.map((a: AccountRow) => ({
			id: a.id,
			name: a.name,
			type: a.type,
			currency: a.currency,
			openingAmount: formatAmount(a.openingAmountMinor),
			openingDate: a.openingDate,
			balance: formatAmount(balances.get(a.id) ?? 0n),
		}));
}

type TransactionInput = {
	form: "PAYMENT" | "RECEIVE";
	primaryAccountId: string;
	date: string;
	totalMinor: bigint;
	memo: string | null;
	allocations: { accountId: string; amountMinor: bigint }[];
};

/** Structural validation only (shape, exact amounts, real dates). */
function parseTransaction(
	body: unknown,
): { input: TransactionInput } | { field: string } {
	const b = (body ?? {}) as Record<string, unknown>;
	if (b.form !== "PAYMENT" && b.form !== "RECEIVE") return { field: "form" };
	if (typeof b.primaryAccountId !== "string" || !UUID.test(b.primaryAccountId))
		return { field: "primaryAccountId" };
	if (!isCalendarDate(b.date)) return { field: "date" };
	const totalMinor = parseAmount(b.total);
	if (totalMinor === null) return { field: "total" };
	if (
		b.memo !== undefined &&
		b.memo !== null &&
		(typeof b.memo !== "string" || b.memo.length > MAX_MEMO)
	)
		return { field: "memo" };
	if (
		!Array.isArray(b.allocations) ||
		b.allocations.length < 1 ||
		b.allocations.length > MAX_LINES
	)
		return { field: "allocations" };
	const allocations: TransactionInput["allocations"] = [];
	for (const [i, raw] of b.allocations.entries()) {
		const line = (raw ?? {}) as Record<string, unknown>;
		const amountMinor = parseAmount(line.amount);
		if (typeof line.accountId !== "string" || !UUID.test(line.accountId))
			return { field: `allocations[${i}].accountId` };
		if (amountMinor === null) return { field: `allocations[${i}].amount` };
		allocations.push({ accountId: line.accountId, amountMinor });
	}
	return {
		input: {
			form: b.form,
			primaryAccountId: b.primaryAccountId,
			date: b.date,
			totalMinor,
			memo: typeof b.memo === "string" && b.memo.trim() ? b.memo.trim() : null,
			allocations,
		},
	};
}

/**
 * Validates and saves one transaction atomically (D-03/D-04): ownership, form/type
 * compatibility, exact allocation sum, date bounds and no negative balances, all checked
 * inside one database transaction against locked account rows.
 */
async function saveTransaction(
	db: Database,
	ownerId: string,
	input: TransactionInput,
) {
	return db.transaction(async (tx) => {
		const referenced = [
			input.primaryAccountId,
			...input.allocations.map((l) => l.accountId),
		];
		const locked = await tx
			.select()
			.from(accounts)
			.where(
				and(
					eq(accounts.ownerId, ownerId),
					inArray(accounts.id, [...new Set(referenced)]),
				),
			)
			.orderBy(asc(accounts.id))
			.for("update");
		const byId = new Map(locked.map((a) => [a.id, a]));
		// Out-of-scope references get the same answer as missing ones (no disclosure).
		if (referenced.some((id) => !byId.has(id)))
			throw new Rejection(404, "NOT_FOUND", "Account not found.");

		const lineIds = input.allocations.map((l) => l.accountId);
		if (
			new Set(lineIds).size !== lineIds.length ||
			lineIds.includes(input.primaryAccountId)
		)
			throw new Rejection(
				422,
				"INVALID_ALLOCATION",
				"Each allocation must use a different account other than the primary account.",
			);
		const sum = input.allocations.reduce((s, l) => s + l.amountMinor, 0n);
		if (sum !== input.totalMinor)
			throw new Rejection(
				422,
				"ALLOCATION_MISMATCH",
				"Allocations must add up exactly to the total.",
			);

		const primary = byId.get(input.primaryAccountId) as AccountRow;
		if (primaryEffect(input.form, primary.type) === null)
			throw new Rejection(
				422,
				"INCOMPATIBLE_ACCOUNT",
				"This account type cannot be the primary account for this form.",
			);
		for (const id of lineIds) {
			const account = byId.get(id) as AccountRow;
			if (allocationEffect(input.form, account.type) === null)
				throw new Rejection(
					422,
					"INCOMPATIBLE_ACCOUNT",
					"An allocation account type is not allowed for this form.",
				);
		}

		if (input.date > bangkokToday())
			throw new Rejection(
				422,
				"INVALID_DATE",
				"The date cannot be later than today.",
			);
		if (
			locked.some((a) => isBalanceAccount(a.type) && input.date < a.openingDate)
		)
			throw new Rejection(
				422,
				"INVALID_DATE",
				"The date cannot be before an affected account's opening date.",
			);

		const ledger = await loadLedger(tx, ownerId);
		const balances = deriveBalances(ledger.accounts, [
			...ledger.transactions.map(asLedger),
			{
				form: input.form,
				primaryAccountId: input.primaryAccountId,
				totalMinor: input.totalMinor,
				allocations: input.allocations,
			},
		]);
		if (
			locked.some(
				(a) => isBalanceAccount(a.type) && (balances.get(a.id) ?? 0n) < 0n,
			)
		)
			throw new Rejection(
				422,
				"INSUFFICIENT_BALANCE",
				"This would make an account balance negative.",
			);

		const [saved] = await tx
			.insert(txns)
			.values({
				ownerId,
				form: input.form,
				primaryAccountId: input.primaryAccountId,
				date: input.date,
				totalMinor: input.totalMinor,
				memo: input.memo,
			})
			.returning();
		if (!saved) throw new Error("transaction insert returned no row");
		const savedLines = await tx
			.insert(lines)
			.values(
				input.allocations.map((l, position) => ({
					transactionId: saved.id,
					accountId: l.accountId,
					amountMinor: l.amountMinor,
					position,
				})),
			)
			.returning();
		savedLines.sort((a, b) => a.position - b.position);
		return transactionDto({ ...saved, lines: savedLines });
	});
}

/** User-only financial routes (F-03 to F-06 shared model; Administrator forbidden). */
export function financeRoutes(deps: {
	db: Database;
	identify: (request: Request) => Promise<Identity | null>;
	failure: Failure;
	json: (status: number, body: unknown) => Response;
}) {
	const { db, identify, failure, json } = deps;
	const requireUser = async (request: Request) => {
		const identity = await identify(request);
		if (!identity)
			return { error: failure(401, "UNAUTHENTICATED", "Sign in to continue.") };
		if (identity.role !== "user")
			return {
				error: failure(
					403,
					"FORBIDDEN",
					"You do not have access to this operation.",
				),
			};
		return { identity };
	};

	return new Elysia()
		.get("/api/accounts", async ({ request }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			return json(200, accountDtos(await loadLedger(db, guard.identity.id)));
		})
		.get("/api/transactions", async ({ request }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			const ledger = await loadLedger(db, guard.identity.id);
			return json(200, ledger.transactions.map(transactionDto));
		})
		.get("/api/transactions/:id", async ({ request, params }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			const notFound = failure(404, "NOT_FOUND", "Transaction not found.");
			if (!UUID.test(params.id)) return notFound;
			const [row] = await db
				.select()
				.from(txns)
				.where(
					and(eq(txns.id, params.id), eq(txns.ownerId, guard.identity.id)),
				);
			if (!row) return notFound;
			const rowLines = await db
				.select()
				.from(lines)
				.where(eq(lines.transactionId, row.id))
				.orderBy(asc(lines.position));
			return json(200, transactionDto({ ...row, lines: rowLines }));
		})
		.post("/api/transactions", async ({ request }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			let body: unknown;
			try {
				body = await request.json();
			} catch {
				body = undefined;
			}
			const parsed = parseTransaction(body);
			if ("field" in parsed)
				return json(400, {
					code: "INVALID_INPUT",
					message:
						"Check the form, account, date and amounts (greater than 0, at most two decimals).",
					field: parsed.field,
				});
			try {
				return json(
					201,
					await saveTransaction(db, guard.identity.id, parsed.input),
				);
			} catch (error) {
				if (error instanceof Rejection)
					return failure(error.status, error.code, error.message);
				throw error;
			}
		})
		.get("/api/summary", async ({ request }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			const url = new URL(request.url);
			const from = url.searchParams.get("from");
			const to = url.searchParams.get("to");
			const bounded = from !== null || to !== null;
			if (
				bounded &&
				(!isCalendarDate(from) || !isCalendarDate(to) || from > to)
			)
				return failure(
					400,
					"INVALID_RANGE",
					"Give both from and to as YYYY-MM-DD with from on or before to.",
				);
			const ledger = await loadLedger(db, guard.identity.id);
			const types = new Map(ledger.accounts.map((a) => [a.id, a.type]));
			let income = 0n;
			let expense = 0n;
			for (const t of ledger.transactions) {
				if (bounded && (t.date < (from as string) || t.date > (to as string)))
					continue;
				for (const l of t.lines) {
					const type = types.get(l.accountId);
					if (t.form === "RECEIVE" && type === "INCOME")
						income += l.amountMinor;
					if (t.form === "PAYMENT" && type === "EXPENSE")
						expense += l.amountMinor;
				}
			}
			return json(200, {
				from: bounded ? from : null,
				to: bounded ? to : null,
				income: formatAmount(income),
				expense: formatAmount(expense),
				accounts: accountDtos(ledger),
			});
		});
}
