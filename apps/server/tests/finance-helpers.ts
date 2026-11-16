import { schema } from "@pocket-ledger/db";
import { STARTER_ACCOUNTS } from "@pocket-ledger/db/seed";
import { count, eq } from "drizzle-orm";

import { createApp } from "../src/app";
import { ALLOWED_ORIGIN, FIXTURE, resetDatabase, TEST_JWT } from "./helpers";

export type Db = Awaited<ReturnType<typeof resetDatabase>>;
export type AccountName = (typeof STARTER_ACCOUNTS)[number]["name"];

/** Opening date used by the independent STS fixture. */
export const OPENING_DATE = "2026-11-01";

/**
 * Fresh fixture database plus starter accounts for User A and User B (the same set the
 * seed creates). Opening balances are set directly as setup because the F-03
 * opening-balance API belongs to Issue #20; every transaction goes through the API.
 */
export async function financeFixture() {
	const db = await resetDatabase();
	const app = createApp({ db, jwt: TEST_JWT, allowedOrigin: ALLOWED_ORIGIN });
	const accounts = {
		userA: {} as Record<AccountName, string>,
		userB: {} as Record<AccountName, string>,
	};
	for (const key of ["userA", "userB"] as const) {
		const [owner] = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.email, FIXTURE[key].email));
		if (!owner) throw new Error(`fixture user ${key} missing`);
		const rows = await db
			.insert(schema.accounts)
			.values(
				STARTER_ACCOUNTS.map((a) => ({
					ownerId: owner.id,
					key: a.key,
					name: a.name,
					type: a.type,
					openingDate: OPENING_DATE,
				})),
			)
			.returning();
		for (const row of rows) accounts[key][row.name as AccountName] = row.id;
	}

	const send = (
		method: string,
		path: string,
		init: { body?: unknown; cookie?: string } = {},
	) =>
		app.handle(
			new Request(`http://localhost${path}`, {
				method,
				headers: {
					...(init.body === undefined
						? {}
						: { "content-type": "application/json" }),
					...(init.cookie ? { cookie: init.cookie } : {}),
					origin: ALLOWED_ORIGIN,
				},
				body: init.body === undefined ? undefined : JSON.stringify(init.body),
			}),
		);
	const login = async (who: keyof typeof FIXTURE) => {
		const res = await send("POST", "/api/session", { body: FIXTURE[who] });
		return res.headers.get("set-cookie")?.split(";")[0] ?? "";
	};
	const setOpening = (accountId: string, minor: bigint, date = OPENING_DATE) =>
		db
			.update(schema.accounts)
			.set({ openingAmountSatang: minor, openingDate: date })
			.where(eq(schema.accounts.id, accountId));
	/** Row counts read straight from the database, independent of the API. */
	const counts = async () => {
		const [t] = await db.select({ n: count() }).from(schema.transactions);
		const [l] = await db
			.select({ n: count() })
			.from(schema.transactionAllocations);
		return { transactions: t?.n ?? -1, lines: l?.n ?? -1 };
	};
	/** Balances by account name from the public API. */
	const balances = async (cookie: string) => {
		const res = await send("GET", "/api/accounts", { cookie });
		const rows = (await res.json()) as { name: string; balance: string }[];
		return Object.fromEntries(rows.map((r) => [r.name, r.balance]));
	};
	return { db, app, accounts, send, login, setOpening, counts, balances };
}

/** The STS card charge: 1,200 split dining 700 and groceries 500. */
export const cardCharge = (
	a: Record<AccountName, string>,
	overrides: Record<string, unknown> = {},
) => ({
	form: "PAYMENT",
	primaryAccountId: a["Credit card"],
	date: "2026-11-03",
	total: "1200.00",
	allocations: [
		{ accountId: a.Dining, amount: "700.00" },
		{ accountId: a.Groceries, amount: "500.00" },
	],
	...overrides,
});

export const salary = (a: Record<AccountName, string>) => ({
	form: "RECEIVE",
	primaryAccountId: a.Bank,
	date: "2026-11-02",
	total: "20000.00",
	allocations: [{ accountId: a.Salary, amount: "20000.00" }],
});

export const repayment = (
	a: Record<AccountName, string>,
	amount = "500.00",
) => ({
	form: "PAYMENT",
	primaryAccountId: a.Bank,
	date: "2026-11-04",
	total: amount,
	allocations: [{ accountId: a["Credit card"], amount }],
});
