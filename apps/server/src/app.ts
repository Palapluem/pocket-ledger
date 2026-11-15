import { resolve, sep } from "node:path";
import { cors } from "@elysiajs/cors";
import type { Database } from "@pocket-ledger/db";
import { schema } from "@pocket-ledger/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { jwtVerify, SignJWT } from "jose";

import { TOKEN_TTL_SECONDS } from "./config";

export type AppConfig = {
	db: Database;
	jwt: { secret: string; issuer: string; audience: string };
	allowedOrigin: string;
	/** Add the Secure cookie attribute; enable under HTTPS. */
	secureCookie?: boolean;
	/** Source commit of the running build, reported by /api/health. */
	commit?: string;
	/** Directory of the built web client; when set it is served from the same origin. */
	webDir?: string;
};

const COOKIE = "session";
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ALGORITHM = "HS256";

const json = (
	status: number,
	body: unknown,
	headers: Record<string, string> = {},
) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json", ...headers },
	});

const failure = (
	status: number,
	code: string,
	message: string,
	headers?: Record<string, string>,
) => json(status, { code, message }, headers);

export function createApp(config: AppConfig) {
	const key = new TextEncoder().encode(config.jwt.secret);
	if (key.length < 32) throw new Error("JWT secret must be at least 32 bytes");
	// Verified against when the email is unknown so both failures cost about the same.
	const dummyHash = Bun.password.hash("not-a-real-password", "argon2id");

	const cookieAttrs = (maxAge: number) =>
		`Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${config.secureCookie ? "; Secure" : ""}`;
	const issueCookie = (token: string) =>
		`${COOKIE}=${token}; ${cookieAttrs(TOKEN_TTL_SECONDS)}`;
	const clearCookie = () => `${COOKIE}=; ${cookieAttrs(0)}`;

	const readCookie = (request: Request) => {
		for (const part of (request.headers.get("cookie") ?? "").split(";")) {
			const [name, ...rest] = part.trim().split("=");
			if (name === COOKIE) return rest.join("=");
		}
		return undefined;
	};

	const identityFrom = async (request: Request) => {
		const token = readCookie(request);
		if (!token) return null;
		try {
			const { payload } = await jwtVerify(token, key, {
				algorithms: [ALGORITHM],
				issuer: config.jwt.issuer,
				audience: config.jwt.audience,
				requiredClaims: ["exp", "sub"],
			});
			const { sub, displayName, role } = payload as Record<string, unknown>;
			if (typeof sub !== "string" || typeof displayName !== "string")
				return null;
			if (role !== "user" && role !== "administrator") return null;
			return { id: sub, displayName, role };
		} catch {
			return null;
		}
	};

	const requireAdmin = async (request: Request) => {
		const identity = await identityFrom(request);
		if (!identity)
			return { error: failure(401, "UNAUTHENTICATED", "Sign in to continue.") };
		if (identity.role !== "administrator") {
			return {
				error: failure(
					403,
					"FORBIDDEN",
					"You do not have access to this operation.",
				),
			};
		}
		return { identity };
	};
	const requireUser = async (request: Request) => {
		const identity = await identityFrom(request);
		if (!identity)
			return { error: failure(401, "UNAUTHENTICATED", "Sign in to continue.") };
		if (identity.role !== "user")
			return {
				error: failure(
					403,
					"FORBIDDEN",
					"You do not have access to this operation.",
				),
			};
		return { identity };
	};
	const formatMoney = (satang: bigint) =>
		`${satang / 100n}.${(satang % 100n).toString().padStart(2, "0")}`;
	const parseMoney = (value: unknown) => {
		if (typeof value !== "string") return null;
		const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value);
		if (!match) return null;
		const whole = match[1];
		if (whole === undefined) return null;
		return (
			BigInt(whole) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0")
		);
	};
	const isCalendarDate = (value: unknown): value is string => {
		if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
			return false;
		const date = new Date(`${value}T00:00:00.000Z`);
		return (
			!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
		);
	};
	const accountDto = (account: typeof schema.accounts.$inferSelect) => {
		const openingDate = account.openingDate as string | Date | null;
		return {
			id: account.id,
			name: account.name,
			type: account.type,
			currency: account.currency,
			openingBalance: formatMoney(account.openingAmountSatang),
			openingDate:
				openingDate instanceof Date
					? openingDate.toISOString().slice(0, 10)
					: openingDate,
			balance: formatMoney(account.openingAmountSatang),
		};
	};
	const safeUser = (u: typeof schema.users.$inferSelect) => ({
		id: u.id,
		email: u.email,
		displayName: u.displayName,
		role: u.role,
		enabled: u.enabled,
	});
	const UUID =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

	return new Elysia()
		.use(
			cors({
				origin: config.allowedOrigin,
				methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
				credentials: true,
			}),
		)
		.onRequest(({ request }) => {
			const origin = request.headers.get("origin");
			if (UNSAFE.has(request.method) && origin !== config.allowedOrigin) {
				return failure(
					403,
					"FORBIDDEN_ORIGIN",
					"Request origin is not allowed.",
				);
			}
		})
		.get("/api/accounts", async ({ request }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			const rows = await config.db
				.select()
				.from(schema.accounts)
				.where(eq(schema.accounts.ownerId, guard.identity.id))
				.orderBy(
					asc(schema.accounts.type),
					asc(schema.accounts.name),
					asc(schema.accounts.id),
				);
			return json(200, rows.map(accountDto));
		})
		.get("/api/accounts/:id", async ({ request, params }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			if (!UUID.test(params.id))
				return failure(404, "NOT_FOUND", "Account not found.");
			const [account] = await config.db
				.select()
				.from(schema.accounts)
				.where(
					and(
						eq(schema.accounts.id, params.id),
						eq(schema.accounts.ownerId, guard.identity.id),
					),
				)
				.limit(1);
			return account
				? json(200, accountDto(account))
				: failure(404, "NOT_FOUND", "Account not found.");
		})
		.put("/api/accounts/:id/opening-balance", async ({ request, params }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			let body: unknown;
			try {
				body = await request.json();
			} catch {
				body = undefined;
			}
			const input = (body ?? {}) as Record<string, unknown>;
			const amount = parseMoney(input.amount);
			if (amount === null || !isCalendarDate(input.date))
				return failure(
					400,
					"INVALID_INPUT",
					"Enter a non-negative amount with up to two decimal places and a valid date.",
				);
			if (!UUID.test(params.id))
				return failure(404, "NOT_FOUND", "Account not found.");
			const [account] = await config.db
				.select()
				.from(schema.accounts)
				.where(
					and(
						eq(schema.accounts.id, params.id),
						eq(schema.accounts.ownerId, guard.identity.id),
					),
				)
				.limit(1);
			if (!account) return failure(404, "NOT_FOUND", "Account not found.");
			if (account.type === "INCOME" || account.type === "EXPENSE")
				return failure(
					422,
					"RULE_VIOLATION",
					"Opening balances are only available for balance-bearing accounts.",
				);
			const [updated] = await config.db
				.update(schema.accounts)
				.set({
					openingAmountSatang: amount,
					openingDate: input.date,
					updatedAt: new Date(),
				})
				.where(eq(schema.accounts.id, account.id))
				.returning();
			return updated
				? json(200, accountDto(updated))
				: failure(404, "NOT_FOUND", "Account not found.");
		})
		.post("/api/session", async ({ request }) => {
			let body: unknown;
			try {
				body = await request.json();
			} catch {
				body = undefined;
			}
			const { email, password } = (body ?? {}) as Record<string, unknown>;
			if (
				typeof email !== "string" ||
				typeof password !== "string" ||
				!email.trim() ||
				!password
			) {
				return failure(
					400,
					"INVALID_INPUT",
					"Email and password are required.",
				);
			}
			const [user] = await config.db
				.select()
				.from(schema.users)
				.where(eq(schema.users.email, email.trim().toLowerCase()))
				.limit(1);
			const passwordOk = await Bun.password.verify(
				password,
				user?.passwordHash ?? (await dummyHash),
			);
			if (!user?.enabled || !passwordOk) {
				return failure(
					401,
					"INVALID_CREDENTIALS",
					"Invalid email or password.",
				);
			}
			const token = await new SignJWT({
				displayName: user.displayName,
				role: user.role,
			})
				.setProtectedHeader({ alg: ALGORITHM })
				.setSubject(user.id)
				.setIssuer(config.jwt.issuer)
				.setAudience(config.jwt.audience)
				.setIssuedAt()
				.setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
				.sign(key);
			return json(
				200,
				{ id: user.id, displayName: user.displayName, role: user.role },
				{
					"set-cookie": issueCookie(token),
				},
			);
		})
		.get("/api/session", async ({ request }) => {
			const identity = await identityFrom(request);
			return identity
				? json(200, identity)
				: failure(401, "UNAUTHENTICATED", "Sign in to continue.");
		})
		.delete(
			"/api/session",
			() =>
				new Response(null, {
					status: 204,
					headers: { "set-cookie": clearCookie() },
				}),
		)
		.get("/api/admin/users", async ({ request }) => {
			const guard = await requireAdmin(request);
			if (guard.error) return guard.error;
			const rows = await config.db
				.select()
				.from(schema.users)
				.orderBy(asc(schema.users.email));
			return json(200, rows.map(safeUser));
		})
		.patch("/api/admin/users/:id", async ({ request, params }) => {
			const guard = await requireAdmin(request);
			if (guard.error) return guard.error;
			let body: unknown;
			try {
				body = await request.json();
			} catch {
				body = undefined;
			}
			const enabled = (body as { enabled?: unknown } | undefined)?.enabled;
			if (typeof enabled !== "boolean") {
				return failure(400, "INVALID_INPUT", "enabled must be true or false.");
			}
			if (!UUID.test(params.id))
				return failure(404, "NOT_FOUND", "User not found.");
			// Approved safeguard: the last enabled administrator can never be disabled.
			// Decided against current database state inside one transaction; enabled
			// administrator rows are locked in id order so concurrent requests serialise.
			const outcome = await config.db.transaction(async (tx) => {
				const admins = await tx
					.select({ id: schema.users.id })
					.from(schema.users)
					.where(
						and(
							eq(schema.users.role, "administrator"),
							eq(schema.users.enabled, true),
						),
					)
					.orderBy(asc(schema.users.id))
					.for("update");
				const targetIsEnabledAdmin = admins.some((a) => a.id === params.id);
				if (!enabled && targetIsEnabledAdmin && admins.length <= 1)
					return "last-admin" as const;
				const [updated] = await tx
					.update(schema.users)
					.set({ enabled, updatedAt: new Date() })
					.where(eq(schema.users.id, params.id))
					.returning();
				return updated ?? ("missing" as const);
			});
			if (outcome === "last-admin")
				return failure(
					409,
					"LAST_ADMIN_FORBIDDEN",
					"The last enabled administrator cannot be disabled.",
				);
			return outcome === "missing"
				? failure(404, "NOT_FOUND", "User not found.")
				: json(200, safeUser(outcome));
		})
		.get("/api/health", async () => {
			const commit = config.commit || "unknown";
			try {
				await config.db.execute(sql`select 1`);
				return json(200, { status: "ok", database: "ok", commit });
			} catch {
				return json(503, {
					status: "degraded",
					database: "unavailable",
					commit,
				});
			}
		})
		.get("/*", async ({ request }) => {
			const path = decodeURIComponent(new URL(request.url).pathname);
			if (!config.webDir || path === "/api" || path.startsWith("/api/"))
				return failure(404, "NOT_FOUND", "Not found.");
			const root = resolve(config.webDir);
			const target = resolve(root, `.${path}`);
			if (target.startsWith(root + sep)) {
				const file = Bun.file(target);
				if (await file.exists()) return new Response(file);
			}
			// A missing file (any path with an extension, e.g. /assets/app-1.js) is a 404;
			// only extension-less client routes (for example /login) load the single-page app.
			if (/\.[^/]+$/.test(path)) return failure(404, "NOT_FOUND", "Not found.");
			return new Response(Bun.file(resolve(root, "index.html")), {
				headers: { "content-type": "text/html; charset=utf-8" },
			});
		});
}
