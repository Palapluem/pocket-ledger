import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import { schema } from "@pocket-ledger/db";
import { seedStarterAccounts } from "@pocket-ledger/db/seed";
import { eq, sql } from "drizzle-orm";

import { createApp } from "../src/app";
import {
	ALLOWED_ORIGIN,
	FIXTURE,
	resetDatabase,
	TEST_JWT,
	testDatabaseUrl,
} from "./helpers";

type Db = Awaited<ReturnType<typeof resetDatabase>>;
type AccountDto = {
	id: string;
	name: string;
	type: string;
	currency: string;
	openingAmount: string;
	openingDate: string | null;
	balance: string;
};
let db: Db;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
	db = await resetDatabase();
	app = createApp({ db, jwt: TEST_JWT, allowedOrigin: ALLOWED_ORIGIN });
});
beforeEach(async () => {
	db = await resetDatabase();
	await seedStarterAccounts(testDatabaseUrl());
	app = createApp({ db, jwt: TEST_JWT, allowedOrigin: ALLOWED_ORIGIN });
});
afterEach(async () => {
	await db.execute(
		sql`drop trigger if exists test_fail_opening_balance on accounts`,
	);
	await db.execute(sql`drop function if exists test_fail_opening_balance()`);
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

describe("TEST-09 / AC-09 through AC-12 account foundation", () => {
	test("accounts with equal type and name are ordered by ID", async () => {
		const user = await db.query.users.findFirst({
			where: eq(schema.users.email, FIXTURE.userA.email),
		});
		if (!user) throw new Error("User A fixture is missing.");
		const ids = [
			"00000000-0000-4000-8000-000000000102",
			"00000000-0000-4000-8000-000000000101",
		] as const;
		await db.insert(schema.accounts).values(
			ids.map((id, index) => ({
				id,
				ownerId: user.id,
				key: `same-name-${index}`,
				name: "Bank",
				type: "CASH" as const,
				currency: "THB",
			})),
		);

		const { cookie } = await signIn();
		const response = await send("GET", "/api/accounts", { cookie });
		const accounts = await readJson<AccountDto[]>(response);
		const insertedIds = new Set<string>(ids);
		expect(
			accounts
				.filter((account) => insertedIds.has(account.id))
				.map((account) => account.id),
		).toEqual([...ids].sort());
	});

	test("an authenticated User lists the five seeded accounts in contract order", async () => {
		const { response: login, cookie } = await signIn();
		expect(login.status).toBe(200);

		const response = await send("GET", "/api/accounts", { cookie });
		expect(response.status).toBe(200);
		const accounts = await readJson<AccountDto[]>(response);
		expect(accounts).toHaveLength(5);
		expect(
			accounts.map(({ name, type }: { name: string; type: string }) => [
				name,
				type,
			]),
		).toEqual([
			["Bank", "CASH"],
			["Credit card", "LOAN_TAKEN"],
			["Salary", "INCOME"],
			["Dining", "EXPENSE"],
			["Groceries", "EXPENSE"],
		]);
		expect(accounts[0]).toMatchObject({
			id: expect.any(String),
			currency: "THB",
			openingAmount: "0.00",
			balance: "0.00",
		});
		expect(accounts[0]?.openingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	test("another User sees a different account set and an Administrator sees none", async () => {
		const { cookie: userACookie } = await signIn();
		const userAResponse = await send("GET", "/api/accounts", {
			cookie: userACookie,
		});
		const userAIds = (await readJson<AccountDto[]>(userAResponse)).map(
			(account) => account.id,
		);

		const userBLogin = await send("POST", "/api/session", {
			body: { email: FIXTURE.userB.email, password: FIXTURE.userB.password },
		});
		const userBCookie =
			userBLogin.headers.get("set-cookie")?.split(";")[0] ?? "";
		const userBResponse = await send("GET", "/api/accounts", {
			cookie: userBCookie,
		});
		const userBIds = (await readJson<AccountDto[]>(userBResponse)).map(
			(account) => account.id,
		);
		expect(userBIds).toHaveLength(5);
		expect(userBIds.some((id: string) => userAIds.includes(id))).toBe(false);

		const adminLogin = await send("POST", "/api/session", {
			body: {
				email: FIXTURE.admin.email,
				password: FIXTURE.admin.password,
			},
		});
		const adminCookie =
			adminLogin.headers.get("set-cookie")?.split(";")[0] ?? "";
		const adminResponse = await send("GET", "/api/accounts", {
			cookie: adminCookie,
		});
		expect(adminResponse.status).toBe(403);
		expect(await adminResponse.json()).toMatchObject({ code: "FORBIDDEN" });
	});

	test("anonymous account listing is rejected", async () => {
		const response = await send("GET", "/api/accounts");
		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
	});

	test("a User retrieves only an owned account detail; a foreign ID is a safe 404", async () => {
		const { cookie: userACookie } = await signIn();
		const { cookie: userBCookie } = await (async () => {
			const response = await send("POST", "/api/session", {
				body: {
					email: FIXTURE.userB.email,
					password: FIXTURE.userB.password,
				},
			});
			return {
				cookie: response.headers.get("set-cookie")?.split(";")[0] ?? "",
			};
		})();
		const userAAccounts = await send("GET", "/api/accounts", {
			cookie: userACookie,
		});
		const userAAccount = (await readJson<AccountDto[]>(userAAccounts))[0];
		if (!userAAccount)
			throw new Error("User A bank account fixture is missing.");
		const own = await send("GET", `/api/accounts/${userAAccount.id}`, {
			cookie: userACookie,
		});
		expect(own.status).toBe(200);
		expect(await own.json()).toMatchObject({
			id: userAAccount.id,
			name: "Bank",
			balance: "0.00",
		});
		const foreign = await send("GET", `/api/accounts/${userAAccount.id}`, {
			cookie: userBCookie,
		});
		expect(foreign.status).toBe(404);
		expect(await foreign.json()).toEqual({
			code: "NOT_FOUND",
			message: "Account not found.",
		});
	});

	test("a User saves and re-reads an exact opening bank balance and date", async () => {
		const { cookie } = await signIn();
		const accountsResponse = await send("GET", "/api/accounts", { cookie });
		const bank = (await readJson<AccountDto[]>(accountsResponse))[0];
		if (!bank) throw new Error("Bank account fixture is missing.");
		const saved = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{
				cookie,
				body: { amount: "10000.00", date: "2026-11-01" },
			},
		);
		expect(saved.status).toBe(200);
		expect(await saved.json()).toMatchObject({
			id: bank.id,
			openingAmount: "10000.00",
			openingDate: "2026-11-01",
			balance: "10000.00",
		});

		const freshRead = await send("GET", `/api/accounts/${bank.id}`, { cookie });
		expect(freshRead.status).toBe(200);
		expect(await freshRead.json()).toMatchObject({
			openingAmount: "10000.00",
			openingDate: "2026-11-01",
			balance: "10000.00",
		});
	});

	test("TEST-10 / AC-10 rejects a future opening date without changing the account", async () => {
		const { cookie } = await signIn();
		const accountsResponse = await send("GET", "/api/accounts", { cookie });
		const bank = (await readJson<AccountDto[]>(accountsResponse))[0];
		if (!bank) throw new Error("Bank account fixture is missing.");

		const today = new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Bangkok",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(new Date());
		const tomorrow = new Date(`${today}T12:00:00.000Z`);
		tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
		const futureDate = tomorrow.toISOString().slice(0, 10);

		const rejected = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{ cookie, body: { amount: "10000.00", date: futureDate } },
		);
		expect(rejected.status).toBe(422);
		expect(await rejected.json()).toEqual({
			code: "RULE_VIOLATION",
			message: "Opening date cannot be later than today.",
		});

		const freshRead = await send("GET", `/api/accounts/${bank.id}`, { cookie });
		expect(freshRead.status).toBe(200);
		expect(await freshRead.json()).toEqual(bank);
	});

	test("an opening-balance database failure returns the standard safe error", async () => {
		const { cookie } = await signIn();
		const accountsResponse = await send("GET", "/api/accounts", { cookie });
		const bank = (await readJson<AccountDto[]>(accountsResponse))[0];
		if (!bank) throw new Error("Bank account fixture is missing.");

		await db.execute(sql`
			create or replace function test_fail_opening_balance()
			returns trigger language plpgsql as $$
			begin raise exception 'injected opening-balance failure'; end $$`);
		await db.execute(sql`
			create trigger test_fail_opening_balance
			before update of opening_amount_satang, opening_date on accounts
			for each row execute function test_fail_opening_balance()`);

		const response = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{ cookie, body: { amount: "10000.00", date: "2026-11-01" } },
		);
		expect(response.status).toBe(500);
		const body = await response.text();
		expect(JSON.parse(body)).toEqual({
			code: "INTERNAL_ERROR",
			message: "The request could not be completed. Nothing was saved.",
		});
		expect(body).not.toContain("injected");

		const freshRead = await send("GET", `/api/accounts/${bank.id}`, {
			cookie,
		});
		expect(await freshRead.json()).toMatchObject({
			openingAmount: "0.00",
			openingDate: bank.openingDate,
			balance: "0.00",
		});
	});

	test("invalid opening amounts and dates are rejected without changing the account", async () => {
		const { cookie } = await signIn();
		const response = await send("GET", "/api/accounts", { cookie });
		const bank = (await readJson<AccountDto[]>(response))[0];
		if (!bank) throw new Error("Bank account fixture is missing.");
		const invalid = [
			{ amount: "-1.00", date: "2026-11-01" },
			{ amount: "10.001", date: "2026-11-01" },
			{ amount: "1e3", date: "2026-11-01" },
			{ amount: "100000000000000000000000000000.00", date: "2026-11-01" },
			{ amount: "100.00", date: "2026-02-30" },
			{ amount: "100.00", date: "2026-11-1" },
		];
		for (const body of invalid) {
			const saved = await send(
				"PUT",
				`/api/accounts/${bank.id}/opening-balance`,
				{ cookie, body },
			);
			expect(saved.status).toBe(400);
			expect(await saved.json()).toMatchObject({ code: "INVALID_INPUT" });
		}
		const freshRead = await send("GET", `/api/accounts/${bank.id}`, { cookie });
		expect(await freshRead.json()).toMatchObject({
			openingAmount: "0.00",
			openingDate: bank.openingDate,
			balance: "0.00",
		});
	});

	test("opening state is owner-scoped and classification accounts cannot have one", async () => {
		const { cookie: userACookie } = await signIn();
		const accountsResponse = await send("GET", "/api/accounts", {
			cookie: userACookie,
		});
		const userAAccounts = await readJson<AccountDto[]>(accountsResponse);
		const bank = userAAccounts[0];
		const salary = userAAccounts.find((account) => account.type === "INCOME");
		if (!bank || !salary) throw new Error("Account fixtures are incomplete.");

		const userBLogin = await send("POST", "/api/session", {
			body: { email: FIXTURE.userB.email, password: FIXTURE.userB.password },
		});
		const userBCookie =
			userBLogin.headers.get("set-cookie")?.split(";")[0] ?? "";
		const foreignUpdate = await send(
			"PUT",
			`/api/accounts/${bank.id}/opening-balance`,
			{
				cookie: userBCookie,
				body: { amount: "10000.00", date: "2026-11-01" },
			},
		);
		expect(foreignUpdate.status).toBe(404);
		expect(await foreignUpdate.json()).toMatchObject({ code: "NOT_FOUND" });
		const unchangedOwnerRecord = await send("GET", `/api/accounts/${bank.id}`, {
			cookie: userACookie,
		});
		expect(unchangedOwnerRecord.status).toBe(200);
		expect(await unchangedOwnerRecord.json()).toEqual(bank);

		const classificationUpdate = await send(
			"PUT",
			`/api/accounts/${salary.id}/opening-balance`,
			{
				cookie: userACookie,
				body: { amount: "100.00", date: "2026-11-01" },
			},
		);
		expect(classificationUpdate.status).toBe(422);
		expect(await classificationUpdate.json()).toMatchObject({
			code: "RULE_VIOLATION",
		});
		const invalidId = await send(
			"PUT",
			"/api/accounts/not-an-id/opening-balance",
			{
				cookie: userACookie,
				body: { amount: "100.00", date: "2026-11-01" },
			},
		);
		expect(invalidId.status).toBe(404);
	});
});

describe("TEST-31 / AC-29 to AC-31 payment limit setter (D-08)", () => {
	type LimitedAccountDto = AccountDto & { paymentLimit?: string | null };

	const listAccounts = async (cookie: string) =>
		readJson<LimitedAccountDto[]>(
			await send("GET", "/api/accounts", { cookie }),
		);
	const accountByName = async (cookie: string, name: string) => {
		const found = (await listAccounts(cookie)).find((a) => a.name === name);
		if (!found) throw new Error(`${name} fixture is missing.`);
		return found;
	};
	const putLimit = (accountId: string, cookie: string, paymentLimit: unknown) =>
		send("PUT", `/api/accounts/${accountId}/payment-limit`, {
			cookie,
			body: { paymentLimit },
		});
	const readDetail = async (accountId: string, cookie: string) =>
		readJson<LimitedAccountDto>(
			await send("GET", `/api/accounts/${accountId}`, { cookie }),
		);
	const loginAs = async (who: keyof typeof FIXTURE) => {
		const response = await send("POST", "/api/session", {
			body: { email: FIXTURE[who].email, password: FIXTURE[who].password },
		});
		return response.headers.get("set-cookie")?.split(";")[0] ?? "";
	};
	/** Sends a request with a chosen Origin header and a raw body. */
	const sendRaw = (
		method: string,
		path: string,
		init: { cookie?: string; origin?: string; rawBody?: string },
	) =>
		app.handle(
			new Request(`http://localhost${path}`, {
				method,
				headers: {
					"content-type": "application/json",
					...(init.cookie ? { cookie: init.cookie } : {}),
					origin: init.origin ?? ALLOWED_ORIGIN,
				},
				body: init.rawBody,
			}),
		);
	/** The driver wraps database errors; collect the whole cause chain as text. */
	const errorText = (error: unknown): string => {
		const parts: string[] = [];
		let current: unknown = error;
		for (let depth = 0; current && depth < 6; depth += 1) {
			const e = current as {
				message?: unknown;
				constraint?: unknown;
				cause?: unknown;
			};
			parts.push(String(e.message ?? ""), String(e.constraint ?? ""));
			current = e.cause;
		}
		return parts.join(" | ");
	};
	const insertAccount = async (
		key: string,
		name: string,
		type: "LOAN_GIVEN",
	) => {
		const owner = await db.query.users.findFirst({
			where: eq(schema.users.email, FIXTURE.userA.email),
		});
		if (!owner) throw new Error("User A fixture is missing.");
		const [row] = await db
			.insert(schema.accounts)
			.values({ ownerId: owner.id, key, name, type, openingDate: "2026-11-01" })
			.returning();
		if (!row) throw new Error("account insert failed");
		return row.id;
	};

	test("every account starts with a null payment limit", async () => {
		const { cookie } = await signIn();
		const accounts = await listAccounts(cookie);
		expect(accounts).toHaveLength(5);
		for (const account of accounts) {
			expect(account.paymentLimit).toBeNull();
			expect((await readDetail(account.id, cookie)).paymentLimit).toBeNull();
		}
	});

	test("the owner sets, normalizes, reads back and clears the limit", async () => {
		const { cookie } = await signIn();
		const card = await accountByName(cookie, "Credit card");
		const steps: [string | null, string | null][] = [
			["100.00", "100.00"],
			["250", "250.00"],
			["0.01", "0.01"],
			["1000000000.00", "1000000000.00"],
			[null, null],
			[null, null],
		];
		for (const [sent, expected] of steps) {
			const response = await putLimit(card.id, cookie, sent);
			expect(response.status).toBe(200);
			const body = await readJson<LimitedAccountDto>(response);
			expect(body).toEqual({ ...card, paymentLimit: expected });

			expect((await readDetail(card.id, cookie)).paymentLimit).toBe(expected);
			expect((await accountByName(cookie, "Credit card")).paymentLimit).toBe(
				expected,
			);
			const summary = await readJson<{ accounts: LimitedAccountDto[] }>(
				await send("GET", "/api/summary", { cookie }),
			);
			expect(summary.accounts.find((a) => a.id === card.id)?.paymentLimit).toBe(
				expected,
			);
		}
	});

	test("invalid values are rejected without change", async () => {
		const { cookie } = await signIn();
		const card = await accountByName(cookie, "Credit card");
		expect((await putLimit(card.id, cookie, "100.00")).status).toBe(200);

		const invalidValues: unknown[] = [
			"0",
			"0.00",
			"-1.00",
			"100.001",
			"1000000000.01",
			"1e3",
			" 100.00",
			"100.00 ",
			"",
			"abc",
			100,
			true,
			[],
			{},
		];
		const expectInvalid = async (response: Response) => {
			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({
				code: "INVALID_INPUT",
				field: "paymentLimit",
			});
		};
		for (const value of invalidValues)
			await expectInvalid(await putLimit(card.id, cookie, value));
		await expectInvalid(
			await send("PUT", `/api/accounts/${card.id}/payment-limit`, {
				cookie,
				body: { somethingElse: "100.00" },
			}),
		);
		await expectInvalid(
			await sendRaw("PUT", `/api/accounts/${card.id}/payment-limit`, {
				cookie,
				rawBody: "{not json",
			}),
		);
		expect((await readDetail(card.id, cookie)).paymentLimit).toBe("100.00");
	});

	test("only Loan Taken accounts accept a limit", async () => {
		const { cookie } = await signIn();
		const loanGivenId = await insertAccount(
			"friend-loan",
			"Friend loan",
			"LOAN_GIVEN",
		);
		const targets = [
			(await accountByName(cookie, "Bank")).id,
			(await accountByName(cookie, "Salary")).id,
			(await accountByName(cookie, "Dining")).id,
			loanGivenId,
		];
		for (const id of targets) {
			const earlier = await readDetail(id, cookie);
			for (const value of ["100.00", null]) {
				const response = await putLimit(id, cookie, value);
				expect(response.status).toBe(422);
				expect(await response.json()).toMatchObject({
					code: "RULE_VIOLATION",
				});
			}
			expect(await readDetail(id, cookie)).toEqual(earlier);
		}
	});

	test("access and ownership", async () => {
		const { cookie: aliceCookie } = await signIn();
		const card = await accountByName(aliceCookie, "Credit card");
		const earlier = await readDetail(card.id, aliceCookie);
		const path = `/api/accounts/${card.id}/payment-limit`;

		const anonymous = await send("PUT", path, {
			body: { paymentLimit: "100.00" },
		});
		expect(anonymous.status).toBe(401);
		expect(await anonymous.json()).toMatchObject({ code: "UNAUTHENTICATED" });

		const admin = await putLimit(card.id, await loginAs("admin"), "100.00");
		expect(admin.status).toBe(403);
		expect(await admin.json()).toMatchObject({ code: "FORBIDDEN" });

		const bobCookie = await loginAs("userB");
		const foreign = await putLimit(card.id, bobCookie, "100.00");
		expect(foreign.status).toBe(404);
		expect(await foreign.json()).toMatchObject({ code: "NOT_FOUND" });

		const unknown = await putLimit(
			"00000000-0000-4000-8000-0000000000ff",
			aliceCookie,
			"100.00",
		);
		expect(unknown.status).toBe(404);
		expect(await unknown.json()).toMatchObject({ code: "NOT_FOUND" });

		const malformed = await putLimit("not-an-id", aliceCookie, "100.00");
		expect(malformed.status).toBe(404);
		expect(await malformed.json()).toMatchObject({ code: "NOT_FOUND" });

		const crossOrigin = await sendRaw("PUT", path, {
			cookie: aliceCookie,
			origin: "http://evil.test",
			rawBody: JSON.stringify({ paymentLimit: "100.00" }),
		});
		expect(crossOrigin.status).toBe(403);
		expect(await crossOrigin.json()).toMatchObject({
			code: "FORBIDDEN_ORIGIN",
		});

		expect(await readDetail(card.id, aliceCookie)).toEqual(earlier);
	});

	test("an opening-balance update and a seed rerun keep the limit", async () => {
		const { cookie } = await signIn();
		const card = await accountByName(cookie, "Credit card");
		expect((await putLimit(card.id, cookie, "100.00")).status).toBe(200);

		const opening = await send(
			"PUT",
			`/api/accounts/${card.id}/opening-balance`,
			{ cookie, body: { amount: "10.00", date: "2026-11-01" } },
		);
		expect(opening.status).toBe(200);
		expect(await readJson<LimitedAccountDto>(opening)).toMatchObject({
			openingAmount: "10.00",
			paymentLimit: "100.00",
		});

		const rerun = await seedStarterAccounts(testDatabaseUrl());
		expect(rerun).toBe(0);
		expect((await readDetail(card.id, cookie)).paymentLimit).toBe("100.00");
	});

	test("the limit is stored as satang and the database CHECK holds", async () => {
		const { cookie } = await signIn();
		const card = await accountByName(cookie, "Credit card");
		expect((await putLimit(card.id, cookie, "100.00")).status).toBe(200);

		const stored = (await db.execute(
			sql`select payment_limit_satang::text as v from accounts where id = ${card.id}`,
		)) as unknown as { v: string }[];
		expect(stored[0]?.v).toBe("10000");

		const setRaw = (value: number) =>
			db.execute(
				sql`update accounts set payment_limit_satang = ${value} where id = ${card.id}`,
			);
		for (const bad of [0, 100000000001]) {
			let failure = "";
			try {
				await setRaw(bad);
			} catch (error) {
				failure = errorText(error);
			}
			expect(failure).toContain("accounts_payment_limit_range");
		}
		await setRaw(1);
		await setRaw(100000000000);
	});
});
