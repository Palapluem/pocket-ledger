import { beforeEach, describe, expect, test } from "bun:test";
import { schema } from "@pocket-ledger/db";
import { eq } from "drizzle-orm";

import { createApp } from "../src/app";
import { ALLOWED_ORIGIN, FIXTURE, resetDatabase, TEST_JWT } from "./helpers";

let db: Awaited<ReturnType<typeof resetDatabase>>;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
	db = await resetDatabase();
	app = createApp({ db, jwt: TEST_JWT, allowedOrigin: ALLOWED_ORIGIN });
});

const send = (
	method: string,
	path: string,
	init: { body?: unknown; cookie?: string; origin?: string } = {},
) =>
	app.handle(
		new Request(`http://localhost${path}`, {
			method,
			headers: {
				...(init.body === undefined
					? {}
					: { "content-type": "application/json" }),
				...(init.cookie ? { cookie: init.cookie } : {}),
				origin: init.origin ?? ALLOWED_ORIGIN,
			},
			body: init.body === undefined ? undefined : JSON.stringify(init.body),
		}),
	);

const login = async (u: { email: string; password: string }) => {
	const res = await send("POST", "/api/session", { body: u });
	return res.headers.get("set-cookie")?.split(";")[0] ?? "";
};

const idOf = async (email: string) => {
	const [row] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, email));
	if (!row) throw new Error(`fixture user ${email} missing`);
	return row.id;
};
const enabledOf = async (email: string) => {
	const [row] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, email));
	return row?.enabled;
};

describe("TEST-06 / AC-06 administrator lists and changes access", () => {
	test("list returns only safe identity fields for every user", async () => {
		const cookie = await login(FIXTURE.admin);
		const res = await send("GET", "/api/admin/users", { cookie });
		expect(res.status).toBe(200);
		const body = (await res.json()) as Record<string, unknown>[];
		expect(body).toHaveLength(Object.keys(FIXTURE).length);
		for (const row of body) {
			expect(Object.keys(row).sort()).toEqual([
				"displayName",
				"email",
				"enabled",
				"id",
				"role",
			]);
		}
		const dora = body.find((r) => r.email === FIXTURE.disabled.email);
		expect(dora?.enabled).toBe(false);
	});
	test("PATCH disables then re-enables a user and persists the state", async () => {
		const cookie = await login(FIXTURE.admin);
		const id = await idOf(FIXTURE.userA.email);
		const off = await send("PATCH", `/api/admin/users/${id}`, {
			cookie,
			body: { enabled: false },
		});
		expect(off.status).toBe(200);
		expect(await off.json()).toEqual({
			id,
			email: FIXTURE.userA.email,
			displayName: FIXTURE.userA.displayName,
			role: "user",
			enabled: false,
		});
		expect(await enabledOf(FIXTURE.userA.email)).toBe(false);
		const on = await send("PATCH", `/api/admin/users/${id}`, {
			cookie,
			body: { enabled: true },
		});
		expect(((await on.json()) as { enabled: boolean }).enabled).toBe(true);
		expect(await enabledOf(FIXTURE.userA.email)).toBe(true);
	});
	test("invalid body, unknown id and self-disable are rejected without changes", async () => {
		const cookie = await login(FIXTURE.admin);
		const id = await idOf(FIXTURE.userA.email);
		for (const body of [{}, { enabled: "no" }, { enabled: 1 }]) {
			const res = await send("PATCH", `/api/admin/users/${id}`, {
				cookie,
				body,
			});
			expect(res.status).toBe(400);
			expect(((await res.json()) as { code: string }).code).toBe(
				"INVALID_INPUT",
			);
		}
		const missing = await send(
			"PATCH",
			`/api/admin/users/${crypto.randomUUID()}`,
			{ cookie, body: { enabled: false } },
		);
		expect(missing.status).toBe(404);
		const notUuid = await send("PATCH", "/api/admin/users/not-a-uuid", {
			cookie,
			body: { enabled: false },
		});
		expect(notUuid.status).toBe(404);
		const adminId = await idOf(FIXTURE.admin.email);
		const self = await send("PATCH", `/api/admin/users/${adminId}`, {
			cookie,
			body: { enabled: false },
		});
		expect(self.status).toBe(409);
		expect(((await self.json()) as { code: string }).code).toBe(
			"SELF_DISABLE_FORBIDDEN",
		);
		expect(await enabledOf(FIXTURE.admin.email)).toBe(true);
		expect(await enabledOf(FIXTURE.userA.email)).toBe(true);
	});
	test("a cross-origin PATCH is rejected", async () => {
		const cookie = await login(FIXTURE.admin);
		const id = await idOf(FIXTURE.userA.email);
		const res = await send("PATCH", `/api/admin/users/${id}`, {
			cookie,
			origin: "http://evil.example",
			body: { enabled: false },
		});
		expect(res.status).toBe(403);
		expect(await enabledOf(FIXTURE.userA.email)).toBe(true);
	});
});

describe("TEST-05 / AC-05 disabling blocks new login", () => {
	test("a disabled user cannot sign in again and re-enabling restores sign-in", async () => {
		const adminCookie = await login(FIXTURE.admin);
		const id = await idOf(FIXTURE.userA.email);
		expect(
			(await send("POST", "/api/session", { body: FIXTURE.userA })).status,
		).toBe(200);
		await send("PATCH", `/api/admin/users/${id}`, {
			cookie: adminCookie,
			body: { enabled: false },
		});
		const blocked = await send("POST", "/api/session", { body: FIXTURE.userA });
		expect(blocked.status).toBe(401);
		expect(blocked.headers.get("set-cookie")).toBeNull();
		await send("PATCH", `/api/admin/users/${id}`, {
			cookie: adminCookie,
			body: { enabled: true },
		});
		expect(
			(await send("POST", "/api/session", { body: FIXTURE.userA })).status,
		).toBe(200);
	});
});

describe("TEST-07 / AC-07 only administrators manage users", () => {
	test("anonymous is 401 and a User is 403 on list and patch, with no change", async () => {
		const id = await idOf(FIXTURE.userB.email);
		const anon = [
			await send("GET", "/api/admin/users"),
			await send("PATCH", `/api/admin/users/${id}`, {
				body: { enabled: false },
			}),
		];
		for (const res of anon) {
			expect(res.status).toBe(401);
			expect(((await res.json()) as { code: string }).code).toBe(
				"UNAUTHENTICATED",
			);
		}
		const userCookie = await login(FIXTURE.userA);
		const forbidden = [
			await send("GET", "/api/admin/users", { cookie: userCookie }),
			await send("PATCH", `/api/admin/users/${id}`, {
				cookie: userCookie,
				body: { enabled: false },
			}),
		];
		for (const res of forbidden) {
			expect(res.status).toBe(403);
			const text = await res.text();
			expect(text).not.toContain(FIXTURE.userB.email);
			expect(JSON.parse(text).code).toBe("FORBIDDEN");
		}
		expect(await enabledOf(FIXTURE.userB.email)).toBe(true);
	});
});
