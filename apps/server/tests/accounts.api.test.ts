import { beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { createApp } from "../src/app";
import { ALLOWED_ORIGIN, FIXTURE, resetDatabase, TEST_JWT } from "./helpers";

type Db = Awaited<ReturnType<typeof resetDatabase>>;
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

async function signIn() {
	const response = await send("POST", "/api/session", {
		body: { email: FIXTURE.userA.email, password: FIXTURE.userA.password },
	});
	const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
	return { response, cookie };
}

describe("TEST-09 / AC-09 through AC-12 account foundation", () => {
	test("an authenticated User lists their complete seeded account set in contract order", async () => {
		const { response: login, cookie } = await signIn();
		expect(login.status).toBe(200);

		const response = await send("GET", "/api/accounts", { cookie });
		expect(response.status).toBe(200);
		const accounts = await response.json();
		expect(accounts).toHaveLength(6);
		expect(
			accounts.map(({ name, type }: { name: string; type: string }) => [
				name,
				type,
			]),
		).toEqual([
			["Bank", "CASH"],
			["Loan Given", "LOAN_GIVEN"],
			["Credit Card", "LOAN_TAKEN"],
			["Salary", "INCOME"],
			["Dining", "EXPENSE"],
			["Groceries", "EXPENSE"],
		]);
		expect(accounts[0]).toMatchObject({
			id: expect.any(String),
			currency: "THB",
			openingBalance: "0.00",
			openingDate: null,
			balance: "0.00",
		});
	});

	test("another User sees a different account set and an Administrator sees none", async () => {
		const { cookie: userACookie } = await signIn();
		const userAResponse = await send("GET", "/api/accounts", {
			cookie: userACookie,
		});
		const userAIds = (await userAResponse.json()).map(
			(account: { id: string }) => account.id,
		);

		const userBLogin = await send("POST", "/api/session", {
			body: { email: FIXTURE.userB.email, password: FIXTURE.userB.password },
		});
		const userBCookie =
			userBLogin.headers.get("set-cookie")?.split(";")[0] ?? "";
		const userBResponse = await send("GET", "/api/accounts", {
			cookie: userBCookie,
		});
		const userBIds = (await userBResponse.json()).map(
			(account: { id: string }) => account.id,
		);
		expect(userBIds).toHaveLength(6);
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
		const [userAAccount] = await userAAccounts.json();
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
});
