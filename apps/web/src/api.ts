export type Identity = {
	id: string;
	displayName: string;
	role: "user" | "administrator";
};

export type ManagedUser = {
	id: string;
	email: string;
	displayName: string;
	role: "user" | "administrator";
	enabled: boolean;
};

export type AccountType =
	| "CASH"
	| "LOAN_TAKEN"
	| "LOAN_GIVEN"
	| "INCOME"
	| "EXPENSE";

/** Canonical F-03/F-05 account DTO used by the UI. */
export type Account = {
	id: string;
	name: string;
	type: AccountType;
	currency: string;
	openingAmount: string;
	openingDate: string | null;
	balance: string;
	/** D-08: two-decimal string, or null when no limit is set (a missing value means null). */
	paymentLimit?: string | null;
};

export type TransactionForm = "PAYMENT" | "RECEIVE";

export type TransactionAllocation = {
	accountId: string;
	amount: string;
};

export type Transaction = {
	id: string;
	form: TransactionForm;
	primaryAccountId: string;
	date: string;
	total: string;
	memo: string | null;
	createdAt: string;
	allocations: TransactionAllocation[];
};

export type NewTransaction = {
	form: TransactionForm;
	primaryAccountId: string;
	date: string;
	total: string;
	memo?: string;
	allocations: TransactionAllocation[];
};

export type Summary = {
	from: string | null;
	to: string | null;
	income: string;
	expense: string;
	accounts: Account[];
};

/** The request may or may not have been saved (network failure or timeout). */
export class UncertainOutcome extends Error {}

export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
	}
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(path, {
		credentials: "same-origin",
		...init,
		headers: {
			...(init.body ? { "content-type": "application/json" } : {}),
			...init.headers,
		},
	});
	if (res.status === 204) return undefined as T;
	const body = (await res.json().catch(() => ({}))) as {
		code?: string;
		message?: string;
	};
	if (!res.ok)
		throw new ApiError(
			res.status,
			body.code ?? "ERROR",
			body.message ?? "Something went wrong. Try again.",
		);
	return body as T;
}

async function createTransaction(input: NewTransaction): Promise<Transaction> {
	try {
		return await request<Transaction>("/api/transactions", {
			method: "POST",
			body: JSON.stringify(input),
			signal: AbortSignal.timeout(15_000),
		});
	} catch (error) {
		// Our own 500 means the database rolled back; a proxy/gateway 5xx does not.
		if (
			error instanceof ApiError &&
			(error.status < 500 || error.code === "INTERNAL_ERROR")
		)
			throw error;
		throw new UncertainOutcome();
	}
}

export const api = {
	signIn: (email: string, password: string) =>
		request<Identity>("/api/session", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		}),
	currentIdentity: async () => {
		try {
			return await request<Identity>("/api/session");
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) return null;
			throw error;
		}
	},
	signOut: () => request<void>("/api/session", { method: "DELETE" }),
	listUsers: () => request<ManagedUser[]>("/api/admin/users"),
	setEnabled: (id: string, enabled: boolean) =>
		request<ManagedUser>(`/api/admin/users/${id}`, {
			method: "PATCH",
			body: JSON.stringify({ enabled }),
		}),
	accounts: () => request<Account[]>("/api/accounts"),
	getAccount: (id: string) => request<Account>(`/api/accounts/${id}`),
	updateOpeningBalance: (id: string, amount: string, date: string) =>
		request<Account>(`/api/accounts/${id}/opening-balance`, {
			method: "PUT",
			body: JSON.stringify({ amount, date }),
		}),
	updatePaymentLimit: (id: string, paymentLimit: string | null) =>
		request<Account>(`/api/accounts/${id}/payment-limit`, {
			method: "PUT",
			body: JSON.stringify({ paymentLimit }),
		}),
	transactions: () => request<Transaction[]>("/api/transactions"),
	getTransaction: (id: string) =>
		request<Transaction>(`/api/transactions/${id}`),
	summary: () => request<Summary>("/api/summary"),
	createTransaction,
	health: () => request<{ status: string; commit: string }>("/api/health"),
};
