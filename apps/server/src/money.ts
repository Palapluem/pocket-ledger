import type { AccountType, TransactionForm } from "@pocket-ledger/db";

/** D-03: 0 < amount ≤ 1,000,000,000.00 THB, at most two decimals, exact satang. */
export const MAX_AMOUNT_MINOR = 100_000_000_000n;
const AMOUNT = /^(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/;

/** Parses a decimal string into satang without rounding; returns null if invalid. */
export function parseAmount(value: unknown): bigint | null {
	if (typeof value !== "string") return null;
	const match = AMOUNT.exec(value);
	if (!match) return null;
	const minor =
		BigInt(match[1] ?? "0") * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
	return minor > 0n && minor <= MAX_AMOUNT_MINOR ? minor : null;
}

/** Formats satang as a plain decimal string with two places, e.g. 120000n -> "1200.00". */
export function formatAmount(minor: bigint): string {
	const sign = minor < 0n ? "-" : "";
	const abs = minor < 0n ? -minor : minor;
	return `${sign}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
}

/** A real calendar date in YYYY-MM-DD form. */
export function isCalendarDate(value: unknown): value is string {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
		return false;
	const d = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Today's calendar date in Asia/Bangkok (D-04). */
export const bangkokToday = (now = new Date()) =>
	new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);

type Sign = 1n | -1n;

/** System SDS effect matrix: change to each account's normal balance. */
const PRIMARY: Record<TransactionForm, Partial<Record<AccountType, Sign>>> = {
	PAYMENT: { CASH: -1n, LOAN_TAKEN: 1n },
	RECEIVE: { CASH: 1n },
};
const ALLOCATION: Record<
	TransactionForm,
	Partial<Record<AccountType, Sign>>
> = {
	PAYMENT: { EXPENSE: 1n, LOAN_TAKEN: -1n, LOAN_GIVEN: 1n, CASH: 1n },
	RECEIVE: { INCOME: 1n, LOAN_GIVEN: -1n, LOAN_TAKEN: 1n, CASH: -1n },
};

export const primaryEffect = (form: TransactionForm, type: AccountType) =>
	PRIMARY[form][type] ?? null;
export const allocationEffect = (form: TransactionForm, type: AccountType) =>
	ALLOCATION[form][type] ?? null;

/** Accounts whose balance can never go below zero and whose opening date bounds dates. */
export const isBalanceAccount = (type: AccountType) =>
	type === "CASH" || type === "LOAN_TAKEN" || type === "LOAN_GIVEN";

export type LedgerAccount = {
	id: string;
	type: AccountType;
	openingAmountMinor: bigint;
};
export type LedgerTransaction = {
	form: TransactionForm;
	primaryAccountId: string;
	totalMinor: bigint;
	allocations: { accountId: string; amountMinor: bigint }[];
};

/** Derives each account's balance from its opening amount and every saved effect. */
export function deriveBalances(
	accounts: LedgerAccount[],
	transactions: LedgerTransaction[],
): Map<string, bigint> {
	const types = new Map(accounts.map((a) => [a.id, a.type]));
	const balances = new Map(accounts.map((a) => [a.id, a.openingAmountMinor]));
	const apply = (id: string, sign: Sign | null, amount: bigint) => {
		const current = balances.get(id);
		if (current === undefined || sign === null) return;
		balances.set(id, current + sign * amount);
	};
	for (const t of transactions) {
		const primaryType = types.get(t.primaryAccountId);
		if (primaryType)
			apply(
				t.primaryAccountId,
				primaryEffect(t.form, primaryType),
				t.totalMinor,
			);
		for (const line of t.allocations) {
			const type = types.get(line.accountId);
			if (type)
				apply(line.accountId, allocationEffect(t.form, type), line.amountMinor);
		}
	}
	return balances;
}
