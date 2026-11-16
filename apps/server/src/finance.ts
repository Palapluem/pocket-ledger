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

const { accounts, transactions: txns } = schema;
const lines = schema.transactionAllocations;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPE_ORDER: AccountType[] = [
	"CASH",
	"LOAN_TAKEN",
	"LOAN_GIVEN",
	"INCOME",
	"EXPENSE",
];
const MAX_LINES = 50;
const MAX_OPENING_SATANG = 9_223_372_036_854_775_807n;

/**
 * The Bun SQL driver returns PostgreSQL `date` values as Date objects at UTC midnight even
 * in Drizzle's string mode; normalise them to the D-04 YYYY-MM-DD form.
 */
const calendar = (value: string | Date) =>
	typeof value === "string" ? value : value.toISOString().slice(0, 10);
const MAX_MEMO = 200;

/** Opening balances allow zero and use the database's signed-BIGINT satang range. */
function parseOpeningAmount(value: unknown): bigint | null {
	if (typeof value !== "string") return null;
	const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value);
	const whole = match?.[1];
	if (!match || whole === undefined || whole.length > 17) return null;
	const amount = BigInt(whole) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
	return amount <= MAX_OPENING_SATANG ? amount : null;
}

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
		.orderBy(desc(txns.occurredOn), desc(txns.createdAt), desc(txns.id));
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
	totalSatang: t.totalSatang,
	allocations: t.lines.map((l) => ({
		accountId: l.accountId,
		amountSatang: l.amountSatang,
	})),
});

const transactionDto = (t: TransactionRow & { lines: LineRow[] }) => ({
	id: t.id,
	form: t.form,
	primaryAccountId: t.primaryAccountId,
	date: calendar(t.occurredOn),
	total: formatAmount(t.totalSatang),
	memo: t.memo,
	createdAt: t.createdAt.toISOString(),
	allocations: t.lines.map((l) => ({
		accountId: l.accountId,
		amount: formatAmount(l.amountSatang),
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
				a.name.localeCompare(b.name) ||
				a.id.localeCompare(b.id),
		)
		.map((a: AccountRow) => ({
			id: a.id,
			name: a.name,
			type: a.type,
			currency: a.currency,
			openingAmount: formatAmount(a.openingAmountSatang),
			openingDate: a.openingDate === null ? null : calendar(a.openingDate),
			balance: formatAmount(balances.get(a.id) ?? 0n),
		}));
}

type TransactionInput = {
	form: "PAYMENT" | "RECEIVE";
	primaryAccountId: string;
	date: string;
	totalSatang: bigint;
	memo: string | null;
	allocations: { accountId: string; amountSatang: bigint }[];
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
	const totalSatang = parseAmount(b.total);
	if (totalSatang === null) return { field: "total" };
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
		const amountSatang = parseAmount(line.amount);
		if (typeof line.accountId !== "string" || !UUID.test(line.accountId))
			return { field: `allocations[${i}].accountId` };
		if (amountSatang === null) return { field: `allocations[${i}].amount` };
		allocations.push({ accountId: line.accountId, amountSatang });
	}
	return {
		input: {
			form: b.form,
			primaryAccountId: b.primaryAccountId,
			date: b.date,
			totalSatang,
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
	const ruleRejection = (code: string, message: string) =>
		new Rejection(
			422,
			input.form === "RECEIVE" ? "RULE_VIOLATION" : code,
			message,
		);
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
			throw ruleRejection(
				"INVALID_ALLOCATION",
				"Each allocation must use a different account other than the primary account.",
			);
		const sum = input.allocations.reduce((s, l) => s + l.amountSatang, 0n);
		if (sum !== input.totalSatang)
			throw ruleRejection(
				"ALLOCATION_MISMATCH",
				"Allocations must add up exactly to the total.",
			);

		const primary = byId.get(input.primaryAccountId) as AccountRow;
		if (input.form === "RECEIVE" && primary.type !== "CASH")
			throw ruleRejection(
				"INCOMPATIBLE_ACCOUNT",
				"Salary receipts require a Cash primary account.",
			);
		if (primaryEffect(input.form, primary.type) === null)
			throw ruleRejection(
				"INCOMPATIBLE_ACCOUNT",
				"This account type cannot be the primary account for this form.",
			);
		for (const id of lineIds) {
			const account = byId.get(id) as AccountRow;
			if (input.form === "RECEIVE" && account.type !== "INCOME")
				throw ruleRejection(
					"INCOMPATIBLE_ACCOUNT",
					"Salary receipts require an Income allocation account.",
				);
			if (allocationEffect(input.form, account.type) === null)
				throw ruleRejection(
					"INCOMPATIBLE_ACCOUNT",
					"An allocation account type is not allowed for this form.",
				);
		}

		if (input.date > bangkokToday())
			throw ruleRejection(
				"INVALID_DATE",
				"The date cannot be later than today.",
			);
		if (
			input.form === "RECEIVE" &&
			locked.some((a) => a.type === "CASH" && a.openingDate === null)
		)
			throw ruleRejection(
				"INVALID_DATE",
				"Set the Cash account opening date before recording this transaction.",
			);
		if (
			locked.some(
				(a) =>
					isBalanceAccount(a.type) &&
					(a.openingDate === null || input.date < calendar(a.openingDate)),
			)
		)
			throw ruleRejection(
				"INVALID_DATE",
				"The date cannot be before an affected account's opening date.",
			);

		const ledger = await loadLedger(tx, ownerId);
		const balances = deriveBalances(ledger.accounts, [
			...ledger.transactions.map(asLedger),
			{
				form: input.form,
				primaryAccountId: input.primaryAccountId,
				totalSatang: input.totalSatang,
				allocations: input.allocations,
			},
		]);
		if (
			locked.some(
				(a) => isBalanceAccount(a.type) && (balances.get(a.id) ?? 0n) < 0n,
			)
		)
			throw ruleRejection(
				"INSUFFICIENT_BALANCE",
				"This would make an account balance negative.",
			);

		const [saved] = await tx
			.insert(txns)
			.values({
				ownerId,
				form: input.form,
				primaryAccountId: input.primaryAccountId,
				occurredOn: input.date,
				totalSatang: input.totalSatang,
				memo: input.memo,
			})
			.returning();
		if (!saved) throw new Error("transaction insert returned no row");
		const savedLines = await tx
			.insert(lines)
			.values(
				input.allocations.map((l, position) => ({
					ownerId,
					transactionId: saved.id,
					accountId: l.accountId,
					amountSatang: l.amountSatang,
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
		.get("/api/accounts/:id", async ({ request, params }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			const notFound = failure(404, "NOT_FOUND", "Account not found.");
			if (!UUID.test(params.id)) return notFound;

			const ledger = await loadLedger(db, guard.identity.id);
			if (!ledger.accounts.some((account) => account.id === params.id))
				return notFound;
			const account = accountDtos(ledger).find((item) => item.id === params.id);
			return account ? json(200, account) : notFound;
		})
		.put("/api/accounts/:id/opening-balance", async ({ request, params }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			let body: unknown;
			try {
				body = await request.json();
			} catch {
				body = undefined;
			}
			const input = (body ?? {}) as Record<string, unknown>;
			const amountSatang = parseOpeningAmount(input.amount);
			if (amountSatang === null || !isCalendarDate(input.date))
				return failure(
					400,
					"INVALID_INPUT",
					"Enter a non-negative amount with up to two decimal places and a valid date.",
				);
			if (!UUID.test(params.id))
				return failure(404, "NOT_FOUND", "Account not found.");
			const openingDate = input.date;

			try {
				const accountDto = await db.transaction(async (tx) => {
					const [account] = await tx
						.select()
						.from(accounts)
						.where(
							and(
								eq(accounts.id, params.id),
								eq(accounts.ownerId, guard.identity.id),
							),
						)
						.orderBy(asc(accounts.id))
						.limit(1)
						.for("update");
					if (!account)
						throw new Rejection(404, "NOT_FOUND", "Account not found.");
					if (!isBalanceAccount(account.type))
						throw new Rejection(
							422,
							"RULE_VIOLATION",
							"Opening balances are only available for balance-bearing accounts.",
						);

					const ledger = await loadLedger(tx, guard.identity.id);
					const relatedTransactions = ledger.transactions.filter(
						(transaction) =>
							transaction.primaryAccountId === account.id ||
							transaction.lines.some((line) => line.accountId === account.id),
					);
					if (
						relatedTransactions.some(
							(transaction) => calendar(transaction.occurredOn) < openingDate,
						)
					)
						throw new Rejection(
							422,
							"RULE_VIOLATION",
							"Opening date cannot be later than an existing related transaction.",
						);

					const currentBalances = deriveBalances(
						ledger.accounts,
						ledger.transactions.map(asLedger),
					);
					const currentBalance =
						currentBalances.get(account.id) ?? account.openingAmountSatang;
					const nextBalance =
						amountSatang + currentBalance - account.openingAmountSatang;
					if (nextBalance < 0n)
						throw new Rejection(
							422,
							"RULE_VIOLATION",
							"Opening change would make the account balance negative.",
						);

					const [updated] = await tx
						.update(accounts)
						.set({
							openingAmountSatang: amountSatang,
							openingDate,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(accounts.id, account.id),
								eq(accounts.ownerId, guard.identity.id),
							),
						)
						.returning();
					if (!updated)
						throw new Rejection(404, "NOT_FOUND", "Account not found.");

					const updatedLedger = {
						...ledger,
						accounts: ledger.accounts.map((row) =>
							row.id === updated.id ? updated : row,
						),
					};
					const result = accountDtos(updatedLedger).find(
						(item) => item.id === updated.id,
					);
					if (!result) throw new Error("updated account DTO was not produced");
					return result;
				});
				return json(200, accountDto);
			} catch (error) {
				if (error instanceof Rejection)
					return failure(error.status, error.code, error.message);
				throw error;
			}
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
			if ("field" in parsed) {
				return json(400, {
					code: "INVALID_INPUT",
					message:
						"Check the form, account, date and amounts (greater than 0, at most two decimals).",
					field: parsed.field,
				});
			}
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
				const day = calendar(t.occurredOn);
				if (bounded && (day < (from as string) || day > (to as string)))
					continue;
				for (const l of t.lines) {
					const type = types.get(l.accountId);
					if (t.form === "RECEIVE" && type === "INCOME")
						income += l.amountSatang;
					if (t.form === "PAYMENT" && type === "EXPENSE")
						expense += l.amountSatang;
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
