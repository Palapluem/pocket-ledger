import type { Database } from "@pocket-ledger/db";
import { schema } from "@pocket-ledger/db";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";
import { jwtVerify, SignJWT } from "jose";

export type AppConfig = {
	db: Database;
	jwt: { secret: string; issuer: string; audience: string; ttlSeconds: number };
	allowedOrigin: string;
	/** Add the Secure cookie attribute; enable under HTTPS. */
	secureCookie?: boolean;
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
		`${COOKIE}=${token}; ${cookieAttrs(config.jwt.ttlSeconds)}`;
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

	return new Elysia()
		.onRequest(({ request }) => {
			const origin = request.headers.get("origin");
			if (
				UNSAFE.has(request.method) &&
				origin !== null &&
				origin !== config.allowedOrigin
			) {
				return failure(
					403,
					"FORBIDDEN_ORIGIN",
					"Request origin is not allowed.",
				);
			}
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
				.setExpirationTime(`${config.jwt.ttlSeconds}s`)
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
		.get("/", () => "OK");
}
