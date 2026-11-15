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

async function signIn() {
	const response = await send("POST", "/api/session", {
		body: { email: FIXTURE.userA.email, password: FIXTURE.userA.password },
	});
	const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
	return { response, cookie };
}

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
});
