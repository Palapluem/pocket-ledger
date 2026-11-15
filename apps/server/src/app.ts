import { resolve, sep } from "node:path";
import { cors } from "@elysiajs/cors";
import type { Database } from "@pocket-ledger/db";
import { schema } from "@pocket-ledger/db";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { jwtVerify, SignJWT } from "jose";

import { TOKEN_TTL_SECONDS } from "./config";
import {
	type AccountType,
	bangkokToday,
	deriveBalances,
	formatMoney,
	isAllowedAllocation,
	isAllowedPrimary,
	isBalanceBearing,
	isCalendarDate,
	MAX_TRANSACTION_SATANG,
	normalizeCalendarDate,
	parseMoney,
} from "./finance";

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
	const accountDto = (
		account: typeof schema.accounts.$inferSelect,
		balance = account.openingAmountSatang,
	) => {
		return {
			id: account.id,
			name: account.name,
			type: account.type,
			currency: account.currency,
			openingBalance: formatMoney(account.openingAmountSatang),
			openingDate: normalizeCalendarDate(
				account.openingDate as unknown as string | Date | null,
			),
			balance: formatMoney(balance),
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
	const calculateBalances = (
		ownedAccounts: (typeof schema.accounts.$inferSelect)[],
		ownedTransactions: (typeof schema.transactions.$inferSelect)[],
		ownedAllocations: {
			transactionId: string;
			accountId: string;
			amountSatang: bigint;
		}[],
	) =>
		deriveBalances(
			ownedAccounts.map((account) => ({
				id: account.id,
				type: account.type,
				openingAmountSatang: account.openingAmountSatang,
			})),
			ownedTransactions.map((transaction) => ({
				id: transaction.id,
				form: transaction.form,
				primaryAccountId: transaction.primaryAccountId,
				totalSatang: transaction.totalSatang,
			})),
			ownedAllocations,
		);
	const accountSnapshot = async (ownerId: string) => {
		const ownedAccounts = await config.db
			.select()
			.from(schema.accounts)
			.where(eq(schema.accounts.ownerId, ownerId));
		const ownedTransactions = await config.db
			.select()
			.from(schema.transactions)
			.where(eq(schema.transactions.ownerId, ownerId));
		const ownedAllocations = await config.db
			.select({
				transactionId: schema.transactionAllocations.transactionId,
				accountId: schema.transactionAllocations.accountId,
				amountSatang: schema.transactionAllocations.amountSatang,
			})
			.from(schema.transactionAllocations)
			.innerJoin(
				schema.transactions,
				eq(schema.transactions.id, schema.transactionAllocations.transactionId),
			)
			.where(eq(schema.transactions.ownerId, ownerId));
		const balances = calculateBalances(
			ownedAccounts,
			ownedTransactions,
			ownedAllocations,
		);
		return { ownedAccounts, balances };
	};
	const transactionDto = async (
		transaction: typeof schema.transactions.$inferSelect,
	) => {
		const allocations = await config.db
			.select()
			.from(schema.transactionAllocations)
			.where(eq(schema.transactionAllocations.transactionId, transaction.id))
			.orderBy(
				asc(schema.transactionAllocations.position),
				asc(schema.transactionAllocations.id),
			);
		return {
			id: transaction.id,
			form: transaction.form,
			primaryAccountId: transaction.primaryAccountId,
			date:
				normalizeCalendarDate(
					transaction.occurredOn as unknown as string | Date,
				) ?? "",
			total: formatMoney(transaction.totalSatang),
			memo: transaction.memo,
			allocations: allocations.map((allocation) => ({
				accountId: allocation.accountId,
				amount: formatMoney(allocation.amountSatang),
			})),
		};
	};

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
			const snapshot = await accountSnapshot(guard.identity.id);
			snapshot.ownedAccounts.sort((a, b) => {
				const rank: Record<AccountType, number> = {
					CASH: 0,
					LOAN_GIVEN: 1,
					LOAN_TAKEN: 2,
					INCOME: 3,
					EXPENSE: 4,
				};
				return (
					rank[a.type] - rank[b.type] ||
					a.name.localeCompare(b.name) ||
					a.id.localeCompare(b.id)
				);
			});
			return json(
				200,
				snapshot.ownedAccounts.map((account) =>
					accountDto(
						account,
						snapshot.balances.get(account.id) ?? account.openingAmountSatang,
					),
				),
			);
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
			if (!account) return failure(404, "NOT_FOUND", "Account not found.");
			const snapshot = await accountSnapshot(guard.identity.id);
			return json(
				200,
				accountDto(
					account,
					snapshot.balances.get(account.id) ?? account.openingAmountSatang,
				),
			);
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
			const openingDate = isCalendarDate(input.date) ? input.date : null;
			if (amount === null || openingDate === null)
				return failure(
					400,
					"INVALID_INPUT",
					"Enter a non-negative amount with up to two decimal places and a valid date.",
				);
			if (!UUID.test(params.id))
				return failure(404, "NOT_FOUND", "Account not found.");
			let result:
				| {
						updated: typeof schema.accounts.$inferSelect;
						balance: bigint;
				  }
				| { error: { status: number; code: string; message: string } };
			try {
				result = await config.db.transaction(async (tx) => {
					const [account] = await tx
						.select()
						.from(schema.accounts)
						.where(
							and(
								eq(schema.accounts.id, params.id),
								eq(schema.accounts.ownerId, guard.identity.id),
							),
						)
						.limit(1)
						.for("update");
					if (!account)
						return {
							error: {
								status: 404,
								code: "NOT_FOUND",
								message: "Account not found.",
							},
						};
					if (!isBalanceBearing(account.type))
						return {
							error: {
								status: 422,
								code: "RULE_VIOLATION",
								message:
									"Opening balances are only available for balance-bearing accounts.",
							},
						};
					const ownedAccounts = await tx
						.select()
						.from(schema.accounts)
						.where(eq(schema.accounts.ownerId, guard.identity.id));
					const ownedTransactions = await tx
						.select()
						.from(schema.transactions)
						.where(eq(schema.transactions.ownerId, guard.identity.id));
					const ownedAllocations = await tx
						.select({
							transactionId: schema.transactionAllocations.transactionId,
							accountId: schema.transactionAllocations.accountId,
							amountSatang: schema.transactionAllocations.amountSatang,
						})
						.from(schema.transactionAllocations)
						.where(
							eq(schema.transactionAllocations.ownerId, guard.identity.id),
						);
					const relatedIds = new Set(
						ownedAllocations
							.filter((line) => line.accountId === account.id)
							.map((line) => line.transactionId),
					);
					const relatedTransactions = ownedTransactions.filter(
						(transaction) =>
							transaction.primaryAccountId === account.id ||
							relatedIds.has(transaction.id),
					);
					if (
						relatedTransactions.some((transaction) => {
							const transactionDate = normalizeCalendarDate(
								transaction.occurredOn as unknown as string | Date,
							);
							return transactionDate !== null && transactionDate < openingDate;
						})
					)
						return {
							error: {
								status: 422,
								code: "RULE_VIOLATION",
								message:
									"Opening date cannot be later than an existing related transaction.",
							},
						};
					const currentBalances = calculateBalances(
						ownedAccounts,
						ownedTransactions,
						ownedAllocations,
					);
					const currentBalance =
						currentBalances.get(account.id) ?? account.openingAmountSatang;
					const nextBalance =
						amount + currentBalance - account.openingAmountSatang;
					if (nextBalance < 0n)
						return {
							error: {
								status: 422,
								code: "RULE_VIOLATION",
								message:
									"Opening change would make the account balance negative.",
							},
						};
					const [updated] = await tx
						.update(schema.accounts)
						.set({
							openingAmountSatang: amount,
							openingDate,
							updatedAt: new Date(),
						})
						.where(eq(schema.accounts.id, account.id))
						.returning();
					return updated
						? { updated, balance: nextBalance }
						: {
								error: {
									status: 404,
									code: "NOT_FOUND",
									message: "Account not found.",
								},
							};
				});
			} catch {
				return failure(
					500,
					"INTERNAL_ERROR",
					"Opening balance could not be saved.",
				);
			}
			if ("error" in result)
				return failure(
					result.error.status,
					result.error.code,
					result.error.message,
				);
			return json(200, accountDto(result.updated, result.balance));
		})
		.post("/api/transactions", async ({ request }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			let body: unknown;
			try {
				body = await request.json();
			} catch {
				body = undefined;
			}
			const input = (body ?? {}) as Record<string, unknown>;
			if (input.form !== "RECEIVE" && input.form !== "PAYMENT")
				return failure(
					400,
					"INVALID_INPUT",
					"form must be RECEIVE or PAYMENT.",
				);
			if (input.form === "PAYMENT")
				return failure(
					422,
					"RULE_VIOLATION",
					"Payment transactions are not available in this increment.",
				);
			if (
				typeof input.primaryAccountId !== "string" ||
				!UUID.test(input.primaryAccountId) ||
				!isCalendarDate(input.date)
			)
				return failure(
					400,
					"INVALID_INPUT",
					"Enter a valid primary account ID and calendar date.",
				);
			const transactionDate = input.date;
			const totalSatang = parseMoney(input.total);
			if (
				totalSatang === null ||
				totalSatang <= 0n ||
				totalSatang > MAX_TRANSACTION_SATANG
			)
				return failure(
					400,
					"INVALID_INPUT",
					"Transaction total must be greater than zero and within the THB limit.",
				);
			if (
				input.memo !== undefined &&
				input.memo !== null &&
				typeof input.memo !== "string"
			)
				return failure(400, "INVALID_INPUT", "memo must be text.");
			if (!Array.isArray(input.allocations) || input.allocations.length === 0)
				return failure(
					400,
					"INVALID_INPUT",
					"At least one allocation is required.",
				);
			const allocations: {
				accountId: string;
				amountSatang: bigint;
				position: number;
			}[] = [];
			for (const [position, value] of input.allocations.entries()) {
				if (typeof value !== "object" || value === null)
					return failure(
						400,
						"INVALID_INPUT",
						"Each allocation must be an object.",
					);
				const line = value as Record<string, unknown>;
				const amountSatang = parseMoney(line.amount);
				if (
					typeof line.accountId !== "string" ||
					!UUID.test(line.accountId) ||
					amountSatang === null ||
					amountSatang <= 0n ||
					amountSatang > MAX_TRANSACTION_SATANG
				)
					return failure(
						400,
						"INVALID_INPUT",
						"Each allocation needs a valid account ID and positive THB amount.",
					);
				allocations.push({ accountId: line.accountId, amountSatang, position });
			}
			const allocatedSatang = allocations.reduce(
				(sum, allocation) => sum + allocation.amountSatang,
				0n,
			);
			if (allocatedSatang !== totalSatang)
				return failure(
					422,
					"RULE_VIOLATION",
					"Allocation amounts must equal the transaction total.",
				);
			const accountIds = [
				input.primaryAccountId,
				...allocations.map((allocation) => allocation.accountId),
			];
			if (new Set(accountIds).size !== accountIds.length)
				return failure(
					422,
					"RULE_VIOLATION",
					"Accounts must be distinct and the primary account cannot be an allocation.",
				);
			if (transactionDate > bangkokToday())
				return failure(
					422,
					"RULE_VIOLATION",
					"Transaction date cannot be in the future.",
				);

			let saved:
				| {
						transaction: typeof schema.transactions.$inferSelect;
				  }
				| { error: { status: number; code: string; message: string } };
			try {
				saved = await config.db.transaction(async (tx) => {
					const accountRows = await tx
						.select()
						.from(schema.accounts)
						.where(
							and(
								eq(schema.accounts.ownerId, guard.identity.id),
								inArray(schema.accounts.id, accountIds),
							),
						)
						.orderBy(asc(schema.accounts.id))
						.for("update");
					if (accountRows.length !== accountIds.length)
						return {
							error: {
								status: 404,
								code: "NOT_FOUND",
								message: "Account not found.",
							},
						};
					const accountsById = new Map(
						accountRows.map((account) => [account.id, account]),
					);
					const primary = accountsById.get(input.primaryAccountId as string);
					if (!primary)
						return {
							error: {
								status: 404,
								code: "NOT_FOUND",
								message: "Account not found.",
							},
						};
					if (!isAllowedPrimary("RECEIVE", primary.type))
						return {
							error: {
								status: 422,
								code: "RULE_VIOLATION",
								message: "Receive money requires a Cash primary account.",
							},
						};
					for (const allocation of allocations) {
						const account = accountsById.get(allocation.accountId);
						if (!account)
							return {
								error: {
									status: 404,
									code: "NOT_FOUND",
									message: "Account not found.",
								},
							};
						if (
							!isAllowedAllocation("RECEIVE", account.type) ||
							account.type !== "INCOME"
						)
							return {
								error: {
									status: 422,
									code: "RULE_VIOLATION",
									message:
										"Salary receipts require an Income allocation account.",
								},
							};
					}
					const openingDate = normalizeCalendarDate(
						primary.openingDate as unknown as string | Date | null,
					);
					if (!openingDate)
						return {
							error: {
								status: 422,
								code: "RULE_VIOLATION",
								message:
									"Set the Cash account opening date before recording this transaction.",
							},
						};
					if (transactionDate < openingDate)
						return {
							error: {
								status: 422,
								code: "RULE_VIOLATION",
								message:
									"Transaction date cannot precede the Cash account opening date.",
							},
						};
					const [transaction] = await tx
						.insert(schema.transactions)
						.values({
							ownerId: guard.identity.id,
							form: "RECEIVE",
							primaryAccountId: primary.id,
							occurredOn: transactionDate,
							totalSatang,
							memo: (input.memo as string | null | undefined) ?? null,
						})
						.returning();
					if (!transaction)
						throw new Error("Transaction insert returned no row.");
					await tx.insert(schema.transactionAllocations).values(
						allocations.map((allocation) => ({
							ownerId: guard.identity.id,
							transactionId: transaction.id,
							accountId: allocation.accountId,
							amountSatang: allocation.amountSatang,
							position: allocation.position,
						})),
					);
					return { transaction };
				});
			} catch {
				return failure(
					500,
					"INTERNAL_ERROR",
					"Transaction could not be saved.",
				);
			}
			if ("error" in saved)
				return failure(
					saved.error.status,
					saved.error.code,
					saved.error.message,
				);
			return json(201, await transactionDto(saved.transaction));
		})
		.get("/api/transactions", async ({ request }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			const rows = await config.db
				.select()
				.from(schema.transactions)
				.where(eq(schema.transactions.ownerId, guard.identity.id))
				.orderBy(
					desc(schema.transactions.occurredOn),
					desc(schema.transactions.id),
				);
			return json(200, await Promise.all(rows.map(transactionDto)));
		})
		.get("/api/transactions/:id", async ({ request, params }) => {
			const guard = await requireUser(request);
			if (guard.error) return guard.error;
			if (!UUID.test(params.id))
				return failure(404, "NOT_FOUND", "Transaction not found.");
			const [transaction] = await config.db
				.select()
				.from(schema.transactions)
				.where(
					and(
						eq(schema.transactions.id, params.id),
						eq(schema.transactions.ownerId, guard.identity.id),
					),
				)
				.limit(1);
			if (!transaction)
				return failure(404, "NOT_FOUND", "Transaction not found.");
			return json(200, await transactionDto(transaction));
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
