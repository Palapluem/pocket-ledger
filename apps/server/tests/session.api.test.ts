import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { schema } from "@pocket-ledger/db";
import { SignJWT } from "jose";

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
	init: { body?: unknown; cookie?: string; origin?: string | null } = {},
) =>
	app.handle(
		new Request(`http://localhost${path}`, {
			method,
			headers: {
				...(init.body === undefined
					? {}
					: { "content-type": "application/json" }),
				...(init.cookie ? { cookie: init.cookie } : {}),
				...(init.origin === null
					? {}
					: { origin: init.origin ?? ALLOWED_ORIGIN }),
			},
			body: init.body === undefined ? undefined : JSON.stringify(init.body),
		}),
	);

const login = async (u: { email: string; password: string }) => {
	const res = await send("POST", "/api/session", {
		body: { email: u.email, password: u.password },
	});
	const cookie = res.headers.get("set-cookie")?.split(";")[0] ?? "";
	return { res, cookie };
};

const forge = (overrides: {
	alg?: string;
	iss?: string;
	aud?: string;
	exp?: number | null;
	secret?: string;
	sub?: string;
	role?: string;
}) =>
	(() => {
		const jwt = new SignJWT({
			displayName: "Forged",
			role: overrides.role ?? "administrator",
		})
			.setProtectedHeader({ alg: overrides.alg ?? "HS256" })
			.setSubject(overrides.sub ?? crypto.randomUUID())
			.setIssuer(overrides.iss ?? TEST_JWT.issuer)
			.setAudience(overrides.aud ?? TEST_JWT.audience)
			.setIssuedAt(Math.floor(Date.now() / 1000) - 10);
		if (overrides.exp !== null)
			jwt.setExpirationTime(
				overrides.exp ?? Math.floor(Date.now() / 1000) + 600,
			);
		return jwt;
	})().sign(new TextEncoder().encode(overrides.secret ?? TEST_JWT.secret));

describe("TEST-01 / AC-01 sign in and current identity", () => {
	test("valid User and Administrator receive their own identity and a cookie", async () => {
		for (const u of [FIXTURE.userA, FIXTURE.admin]) {
			const { res, cookie } = await login(u);
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body).toEqual({
				id: expect.any(String),
				displayName: u.displayName,
				role: u.role,
			});
			const setCookie = res.headers.get("set-cookie") ?? "";
			expect(setCookie).toContain("HttpOnly");
			expect(setCookie).toContain("SameSite=Lax");
			expect(JSON.stringify(body)).not.toContain(cookie.split("=")[1] ?? "x");
			const me = await send("GET", "/api/session", { cookie });
			expect(me.status).toBe(200);
			expect(await me.json()).toEqual(body);
		}
	});
	test("email is matched case-insensitively and trimmed", async () => {
		const res = await send("POST", "/api/session", {
			body: {
				email: `  ${FIXTURE.userA.email.toUpperCase()} `,
				password: FIXTURE.userA.password,
			},
		});
		expect(res.status).toBe(200);
	});
	test("password hash is stored, never the plaintext", async () => {
		const rows = await db.select().from(schema.users);
		for (const r of rows) {
			expect(r.passwordHash.startsWith("$argon2id$")).toBe(true);
			expect(Object.values(FIXTURE).map((u) => u.password)).not.toContain(
				r.passwordHash,
			);
		}
	});
});

describe("TEST-02 / AC-02 safe login failure", () => {
	test("wrong password, unknown email and disabled user get the same 401 and no cookie", async () => {
		const attempts = [
			{ email: FIXTURE.userA.email, password: "wrong" },
			{ email: "nobody@example.test", password: "whatever-1" },
			{ email: FIXTURE.disabled.email, password: FIXTURE.disabled.password },
		];
		const bodies: unknown[] = [];
		for (const a of attempts) {
			const res = await send("POST", "/api/session", { body: a });
			expect(res.status).toBe(401);
			expect(res.headers.get("set-cookie")).toBeNull();
			bodies.push(await res.json());
		}
		expect(bodies[0]).toEqual({
			code: "INVALID_CREDENTIALS",
			message: expect.any(String),
		});
		expect(bodies[1]).toEqual(bodies[0]);
		expect(bodies[2]).toEqual(bodies[0]);
	});
	test("malformed input is 400 INVALID_INPUT", async () => {
		for (const body of [
			{},
			{ email: "a@b.test" },
			{ email: 5, password: "x" },
		]) {
			const res = await send("POST", "/api/session", { body });
			expect(res.status).toBe(400);
			expect(((await res.json()) as { code: string }).code).toBe(
				"INVALID_INPUT",
			);
		}
	});
});

describe("TEST-03 / AC-03 protected access", () => {
	test("no credential is 401 UNAUTHENTICATED", async () => {
		const res = await send("GET", "/api/session");
		expect(res.status).toBe(401);
		expect(((await res.json()) as { code: string }).code).toBe(
			"UNAUTHENTICATED",
		);
	});
	test("tampered, expired, wrong issuer, wrong audience, wrong key, wrong algorithm, alg-none and missing-exp tokens are rejected", async () => {
		const good = (await login(FIXTURE.userA)).cookie.split("=")[1] ?? "";
		const [h, p, s] = good.split(".");
		const tampered = `${h}.${btoa(JSON.stringify({ sub: "x", role: "administrator" })).replaceAll("=", "")}.${s}`;
		const none = `${btoa(JSON.stringify({ alg: "none", typ: "JWT" })).replaceAll("=", "")}.${p}.`;
		const tokens = [
			tampered,
			none,
			await forge({ exp: Math.floor(Date.now() / 1000) - 5 }),
			await forge({ exp: null }),
			await forge({ iss: "someone-else" }),
			await forge({ aud: "other-audience" }),
			await forge({ secret: "a-different-secret-that-is-long-enough-1234" }),
			await forge({ alg: "HS512" }),
		];
		for (const t of tokens) {
			const res = await send("GET", "/api/session", { cookie: `session=${t}` });
			expect(res.status).toBe(401);
			expect(((await res.json()) as { code: string }).code).toBe(
				"UNAUTHENTICATED",
			);
		}
	});
});

describe("TEST-04 / AC-04 logout", () => {
	test("DELETE returns 204 and clears the cookie, also when already signed out", async () => {
		const { cookie } = await login(FIXTURE.userA);
		for (const c of [cookie, undefined]) {
			const res = await send("DELETE", "/api/session", { cookie: c });
			expect(res.status).toBe(204);
			const sc = (res.headers.get("set-cookie") ?? "").toLowerCase();
			expect(sc).toMatch(/max-age=0|expires=thu, 01 jan 1970/);
		}
		expect((await send("GET", "/api/session")).status).toBe(401);
	});
});

describe("sign-up and request protection", () => {
	test("no public signup route exists and no user is created", async () => {
		const before = (await db.select().from(schema.users)).length;
		for (const path of [
			"/api/signup",
			"/api/users",
			"/api/auth/sign-up/email",
		]) {
			const res = await send("POST", path, {
				body: {
					email: "new@example.test",
					password: "new-pass-12345",
					displayName: "New",
				},
			});
			expect([404, 405]).toContain(res.status);
		}
		expect((await db.select().from(schema.users)).length).toBe(before);
	});
	test("unsafe request from an unapproved Origin is 403 and issues no cookie", async () => {
		const res = await send("POST", "/api/session", {
			origin: "http://evil.example",
			body: { email: FIXTURE.userA.email, password: FIXTURE.userA.password },
		});
		expect(res.status).toBe(403);
		expect(res.headers.get("set-cookie")).toBeNull();
	});
	test("unsafe request with no Origin is 403 FORBIDDEN_ORIGIN and issues no cookie", async () => {
		const login = await send("POST", "/api/session", {
			origin: null,
			body: { email: FIXTURE.userA.email, password: FIXTURE.userA.password },
		});
		expect(login.status).toBe(403);
		expect(((await login.json()) as { code: string }).code).toBe(
			"FORBIDDEN_ORIGIN",
		);
		expect(login.headers.get("set-cookie")).toBeNull();
		const logout = await send("DELETE", "/api/session", { origin: null });
		expect(logout.status).toBe(403);
	});
	test("safe GET with no Origin is still allowed", async () => {
		const res = await send("GET", "/api/session", { origin: null });
		expect(res.status).toBe(401);
	});
});
