import { beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { createApp } from "../src/app";
import { ALLOWED_ORIGIN, FIXTURE, resetDatabase, TEST_JWT } from "./helpers";

type Db = Awaited<ReturnType<typeof resetDatabase>>;
type AccountDto = {
	id: string;
	name: string;
	type: string;
	openingBalance: string;
	openingDate: string | null;
	balance: string;
};
type TransactionDto = {
	id: string;
	form: string;
	primaryAccountId: string;
	date: string;
	total: string;
	allocations: { accountId: string; amount: string }[];
};

let db: Db;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
	db = await resetDatabase();
	app = createApp({ db, jwt: TEST_JWT, allowedOrigin: ALLOWED_ORIGIN });
});
beforeEach(async () => {
	db = await resetDatabase();
	app = createApp({ db, jwt: TEST_JWT, allowedOrigin: ALLOWED_ORIGIN });
});

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

const readJson = async <T>(response: Response) => (await response.json()) as T;

async function signInAs(email: string, password: string) {
	const response = await send("POST", "/api/session", {
		body: { email, password },
	});
	const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
	return { response, cookie };
}

const signIn = () => signInAs(FIXTURE.userA.email, FIXTURE.userA.password);

async function loadAccounts(cookie: string) {
	const response = await send("GET", "/api/accounts", { cookie });
	return { response, accounts: await readJson<AccountDto[]>(response) };
}

const salaryReceipt = (
	primaryAccountId: string,
	allocationAccountId: string,
	options: {
		date?: string;
		total?: string;
		allocationAmount?: string;
	} = {},
) => ({
	form: "RECEIVE",
	primaryAccountId,
	date: options.date ?? "2026-11-02",
	total: options.total ?? "20000.00",
	allocations: [
		{
			accountId: allocationAccountId,
			amount: options.allocationAmount ?? options.total ?? "20000.00",
		},
	],
});

describe("TEST-13 / AC-13 salary receipt", () => {
	test("receives salary atomically and returns the persisted transaction and balances", async () => {
		const { response: login, cookie } = await signIn();
		expect(login.status).toBe(200);
		const listed = await send("GET", "/api/accounts", { cookie });
		const accounts = await readJson<AccountDto[]>(listed);
		const bank = accounts.find((account) => account.name === "Bank");
		const salary = accounts.find((account) => account.name === "Salary");
		if (!bank || !salary)
			throw new Error("Required seeded accounts are missing.");

		const opening = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{ cookie, body: { amount: "10000.00", date: "2026-11-01" } },
		);
		expect(opening.status).toBe(200);

		const saved = await send("POST", "/api/transactions", {
			cookie,
			body: {
				form: "RECEIVE",
				primaryAccountId: bank.id,
				date: "2026-11-02",
				total: "20000.00",
				allocations: [{ accountId: salary.id, amount: "20000.00" }],
			},
		});
		expect(saved.status).toBe(201);
		const created = await readJson<TransactionDto>(saved);
		const transactionId = created.id;
		expect(typeof transactionId).toBe("string");
		expect(created).toMatchObject({
			form: "RECEIVE",
			primaryAccountId: bank.id,
			date: "2026-11-02",
			total: "20000.00",
			allocations: [{ accountId: salary.id, amount: "20000.00" }],
		});

		const detail = await send("GET", `/api/transactions/${transactionId}`, {
			cookie,
		});
		expect(detail.status).toBe(200);
		expect(await readJson<TransactionDto>(detail)).toMatchObject(created);

		const freshAccounts = await send("GET", "/api/accounts", { cookie });
		const balances = await readJson<AccountDto[]>(freshAccounts);
		expect(balances.find((account) => account.id === bank.id)?.balance).toBe(
			"30000.00",
		);
		expect(balances.find((account) => account.id === salary.id)?.balance).toBe(
			"20000.00",
		);
	});

	test("TEST-14 / AC-14 rejects a salary allocation total mismatch without any effect", async () => {
		const { response: login, cookie } = await signIn();
		expect(login.status).toBe(200);
		const listed = await send("GET", "/api/accounts", { cookie });
		const accounts = await readJson<AccountDto[]>(listed);
		const bank = accounts.find((account) => account.name === "Bank");
		const salary = accounts.find((account) => account.name === "Salary");
		if (!bank || !salary)
			throw new Error("Required seeded accounts are missing.");

		const opening = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{ cookie, body: { amount: "10000.00", date: "2026-11-01" } },
		);
		expect(opening.status).toBe(200);

		const rejected = await send("POST", "/api/transactions", {
			cookie,
			body: {
				form: "RECEIVE",
				primaryAccountId: bank.id,
				date: "2026-11-02",
				total: "20000.00",
				allocations: [{ accountId: salary.id, amount: "19999.99" }],
			},
		});
		expect(rejected.status).toBe(422);
		expect(await readJson(rejected)).toMatchObject({
			code: "RULE_VIOLATION",
		});

		const history = await send("GET", "/api/transactions", { cookie });
		expect(history.status).toBe(200);
		expect(await readJson(history)).toEqual([]);

		const freshAccounts = await send("GET", "/api/accounts", { cookie });
		const balances = await readJson<AccountDto[]>(freshAccounts);
		expect(balances.find((account) => account.id === bank.id)?.balance).toBe(
			"10000.00",
		);
		expect(balances.find((account) => account.id === salary.id)?.balance).toBe(
			"0.00",
		);
	});

	test("TEST-15 / AC-15 rejects incompatible, repeated and foreign account references", async () => {
		const { cookie } = await signIn();
		const { accounts } = await loadAccounts(cookie);
		const bank = accounts.find((account) => account.type === "CASH");
		const salary = accounts.find((account) => account.type === "INCOME");
		const expense = accounts.find((account) => account.type === "EXPENSE");
		if (!bank || !salary || !expense)
			throw new Error("Required seeded accounts are missing.");
		const opening = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{ cookie, body: { amount: "10000.00", date: "2026-11-01" } },
		);
		expect(opening.status).toBe(200);

		const cases = [
			{
				body: {
					...salaryReceipt(bank.id, expense.id, {
						total: "1.00",
					}),
				},
				status: 422,
			},
			{
				body: {
					...salaryReceipt(bank.id, salary.id, {
						total: "2.00",
					}),
					allocations: [
						{ accountId: salary.id, amount: "1.00" },
						{ accountId: salary.id, amount: "1.00" },
					],
				},
				status: 422,
			},
			{
				body: {
					...salaryReceipt(bank.id, bank.id, { total: "1.00" }),
				},
				status: 422,
			},
		];
		for (const { body, status } of cases) {
			const response = await send("POST", "/api/transactions", {
				cookie,
				body,
			});
			expect(response.status).toBe(status);
			expect(await response.json()).toMatchObject({
				code: "RULE_VIOLATION",
			});
		}

		const { cookie: userBCookie } = await signInAs(
			FIXTURE.userB.email,
			FIXTURE.userB.password,
		);
		const userBAccounts = await loadAccounts(userBCookie);
		const userBSalary = userBAccounts.accounts.find(
			(account) => account.type === "INCOME",
		);
		if (!userBSalary) throw new Error("User B salary fixture is missing.");
		const foreign = await send("POST", "/api/transactions", {
			cookie,
			body: salaryReceipt(bank.id, userBSalary.id, { total: "1.00" }),
		});
		expect(foreign.status).toBe(404);
		expect(await foreign.json()).toMatchObject({ code: "NOT_FOUND" });

		const history = await send("GET", "/api/transactions", { cookie });
		expect(await readJson(history)).toEqual([]);
	});

	test("TEST-16 / AC-16 rejects malformed, out-of-range and out-of-period inputs", async () => {
		const { cookie } = await signIn();
		const { accounts } = await loadAccounts(cookie);
		const bank = accounts.find((account) => account.type === "CASH");
		const salary = accounts.find((account) => account.type === "INCOME");
		if (!bank || !salary)
			throw new Error("Required seeded accounts are missing.");
		const opening = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{ cookie, body: { amount: "10000.00", date: "2026-11-01" } },
		);
		expect(opening.status).toBe(200);

		const invalidAmounts = ["0.00", "-1.00", "1.001", "1e3", "1000000000.01"];
		for (const total of invalidAmounts) {
			const response = await send("POST", "/api/transactions", {
				cookie,
				body: salaryReceipt(bank.id, salary.id, { total }),
			});
			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({ code: "INVALID_INPUT" });
		}

		for (const [date, status, code] of [
			["2026-02-30", 400, "INVALID_INPUT"],
			["2026-10-31", 422, "RULE_VIOLATION"],
			["2099-01-01", 422, "RULE_VIOLATION"],
		] as const) {
			const response = await send("POST", "/api/transactions", {
				cookie,
				body: salaryReceipt(bank.id, salary.id, { date }),
			});
			expect(response.status).toBe(status);
			expect(await response.json()).toMatchObject({ code });
		}
		const history = await send("GET", "/api/transactions", { cookie });
		expect(await readJson(history)).toEqual([]);
	});

	test("TEST-10 / AC-10 preserves activity when an opening balance is edited", async () => {
		const { cookie } = await signIn();
		const { accounts } = await loadAccounts(cookie);
		const bank = accounts.find((account) => account.type === "CASH");
		const salary = accounts.find((account) => account.type === "INCOME");
		if (!bank || !salary)
			throw new Error("Required seeded accounts are missing.");
		const initialOpening = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{ cookie, body: { amount: "10000.00", date: "2026-11-01" } },
		);
		expect(initialOpening.status).toBe(200);
		const receipt = await send("POST", "/api/transactions", {
			cookie,
			body: salaryReceipt(bank.id, salary.id),
		});
		expect(receipt.status).toBe(201);

		const laterOpeningDate = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{ cookie, body: { amount: "12000.00", date: "2026-11-03" } },
		);
		expect(laterOpeningDate.status).toBe(422);
		expect(await laterOpeningDate.json()).toMatchObject({
			code: "RULE_VIOLATION",
		});
		const unchanged = await send("GET", `/api/accounts/${bank.id}`, { cookie });
		expect(await unchanged.json()).toMatchObject({
			openingBalance: "10000.00",
			openingDate: "2026-11-01",
			balance: "30000.00",
		});

		const adjusted = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{ cookie, body: { amount: "9000.00", date: "2026-11-02" } },
		);
		expect(adjusted.status).toBe(200);
		expect(await adjusted.json()).toMatchObject({
			openingBalance: "9000.00",
			openingDate: "2026-11-02",
			balance: "29000.00",
		});
	});

	test("TEST-21 / AC-21 scopes transaction reads and writes by User and role", async () => {
		const { cookie: userACookie } = await signIn();
		const { accounts: userAAccounts } = await loadAccounts(userACookie);
		const bank = userAAccounts.find((account) => account.type === "CASH");
		const salary = userAAccounts.find((account) => account.type === "INCOME");
		if (!bank || !salary)
			throw new Error("User A account fixture is incomplete.");
		const opening = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{ cookie: userACookie, body: { amount: "10000.00", date: "2026-11-01" } },
		);
		expect(opening.status).toBe(200);
		const saved = await send("POST", "/api/transactions", {
			cookie: userACookie,
			body: salaryReceipt(bank.id, salary.id),
		});
		expect(saved.status).toBe(201);
		const transaction = await readJson<TransactionDto>(saved);

		const { cookie: userBCookie } = await signInAs(
			FIXTURE.userB.email,
			FIXTURE.userB.password,
		);
		const userBHistory = await send("GET", "/api/transactions", {
			cookie: userBCookie,
		});
		expect(await readJson(userBHistory)).toEqual([]);
		const foreignDetail = await send(
			"GET",
			`/api/transactions/${transaction.id}`,
			{ cookie: userBCookie },
		);
		expect(foreignDetail.status).toBe(404);
		expect(await foreignDetail.json()).toEqual({
			code: "NOT_FOUND",
			message: "Transaction not found.",
		});
		const foreignWrite = await send("POST", "/api/transactions", {
			cookie: userBCookie,
			body: salaryReceipt(bank.id, salary.id),
		});
		expect(foreignWrite.status).toBe(404);
		expect(await foreignWrite.json()).toMatchObject({ code: "NOT_FOUND" });

		const adminLogin = await signInAs(
			FIXTURE.admin.email,
			FIXTURE.admin.password,
		);
		const adminRead = await send("GET", "/api/transactions", {
			cookie: adminLogin.cookie,
		});
		expect(adminRead.status).toBe(403);
		const anonymousRead = await send("GET", "/api/transactions");
		expect(anonymousRead.status).toBe(401);
		const anonymousWrite = await send("POST", "/api/transactions", {
			body: salaryReceipt(bank.id, salary.id),
		});
		expect(anonymousWrite.status).toBe(401);
	});
});
