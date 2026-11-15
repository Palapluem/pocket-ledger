export const MAX_SATANG = 9_223_372_036_854_775_807n;
export const MAX_TRANSACTION_SATANG = 100_000_000_000n;

export type AccountType =
	| "CASH"
	| "LOAN_GIVEN"
	| "LOAN_TAKEN"
	| "INCOME"
	| "EXPENSE";
export type TransactionForm = "PAYMENT" | "RECEIVE";

export function parseMoney(value: unknown): bigint | null {
	if (typeof value !== "string") return null;
	const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value);
	const whole = match?.[1];
	if (!match || whole === undefined || whole.length > 17) return null;
	const amount =
		BigInt(whole) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
	return amount <= MAX_SATANG ? amount : null;
}

export function formatMoney(satang: bigint): string {
	const absolute = satang < 0n ? -satang : satang;
	const value = `${absolute / 100n}.${(absolute % 100n)
		.toString()
		.padStart(2, "0")}`;
	return satang < 0n ? `-${value}` : value;
}

export function isCalendarDate(value: unknown): value is string {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
		return false;
	const date = new Date(`${value}T00:00:00.000Z`);
	return (
		!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
	);
}

export function normalizeCalendarDate(
	value: string | Date | null,
): string | null {
	if (value === null) return null;
	return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

export function bangkokToday(now = new Date()): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Bangkok",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((entry) => entry.type === type)?.value ?? "";
	return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isBalanceBearing(type: AccountType): boolean {
	return type === "CASH" || type === "LOAN_GIVEN" || type === "LOAN_TAKEN";
}

export function isAllowedPrimary(
	form: TransactionForm,
	type: AccountType,
): boolean {
	return form === "RECEIVE"
		? type === "CASH"
		: type === "CASH" || type === "LOAN_TAKEN";
}

export function isAllowedAllocation(
	form: TransactionForm,
	type: AccountType,
): boolean {
	return form === "RECEIVE"
		? type === "CASH" ||
				type === "LOAN_GIVEN" ||
				type === "LOAN_TAKEN" ||
				type === "INCOME"
		: type === "CASH" ||
				type === "LOAN_GIVEN" ||
				type === "LOAN_TAKEN" ||
				type === "EXPENSE";
}

export function primaryBalanceEffect(
	form: TransactionForm,
	type: AccountType,
	total: bigint,
): bigint | null {
	if (!isAllowedPrimary(form, type)) return null;
	if (form === "RECEIVE" && type === "CASH") return total;
	if (form === "PAYMENT" && type === "CASH") return -total;
	if (form === "PAYMENT" && type === "LOAN_TAKEN") return total;
	return null;
}

export function allocationBalanceEffect(
	form: TransactionForm,
	type: AccountType,
	amount: bigint,
): bigint | null {
	if (!isAllowedAllocation(form, type)) return null;
	if (form === "PAYMENT") {
		if (type === "CASH" || type === "LOAN_GIVEN" || type === "EXPENSE")
			return amount;
		if (type === "LOAN_TAKEN") return -amount;
	}
	if (form === "RECEIVE") {
		if (type === "INCOME" || type === "LOAN_TAKEN") return amount;
		if (type === "CASH" || type === "LOAN_GIVEN") return -amount;
	}
	return null;
}

export type BalanceAccount = {
	id: string;
	type: AccountType;
	openingAmountSatang: bigint;
};
export type BalanceTransaction = {
	id: string;
	form: TransactionForm;
	primaryAccountId: string;
	totalSatang: bigint;
};
export type BalanceAllocation = {
	transactionId: string;
	accountId: string;
	amountSatang: bigint;
};

export function deriveBalances(
	accounts: BalanceAccount[],
	transactions: BalanceTransaction[],
	allocations: BalanceAllocation[],
): Map<string, bigint> {
	const accountById = new Map(accounts.map((account) => [account.id, account]));
	const transactionById = new Map(
		transactions.map((transaction) => [transaction.id, transaction]),
	);
	const balances = new Map(
		accounts.map((account) => [account.id, account.openingAmountSatang]),
	);
	const add = (accountId: string, effect: bigint | null) => {
		const current = balances.get(accountId);
		if (current === undefined || effect === null)
			throw new Error(
				"Stored financial records violate the approved account rules.",
			);
		balances.set(accountId, current + effect);
	};

	for (const transaction of transactions) {
		const primary = accountById.get(transaction.primaryAccountId);
		if (!primary)
			throw new Error("Stored transaction refers to a missing owned account.");
		add(
			primary.id,
			primaryBalanceEffect(
				transaction.form,
				primary.type,
				transaction.totalSatang,
			),
		);
	}
	for (const allocation of allocations) {
		const transaction = transactionById.get(allocation.transactionId);
		const account = accountById.get(allocation.accountId);
		if (!transaction || !account)
			throw new Error("Stored allocation refers to a missing owned record.");
		add(
			account.id,
			allocationBalanceEffect(
				transaction.form,
				account.type,
				allocation.amountSatang,
			),
		);
	}
	return balances;
}
