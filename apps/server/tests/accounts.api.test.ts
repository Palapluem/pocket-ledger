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
	test("an authenticated User lists only their seeded accounts with derived balances", async () => {
		const { response: login, cookie } = await signIn();
		expect(login.status).toBe(200);

		const response = await send("GET", "/api/accounts", { cookie });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(
			expect.arrayContaining([
				{
				id: expect.any(String),
				name: "Bank",
				type: "CASH",
				currency: "THB",
				openingBalance: "0.00",
				openingDate: null,
				balance: "0.00",
				},
			]),
		);
	});
});
