/** Approved in D-05: tokens and cookies live for exactly one hour. Not configurable. */
export const TOKEN_TTL_SECONDS = 3600;

type Env = Record<string, string | undefined>;

function required(env: Env, name: string) {
	const value = env[name];
	if (!value) throw new Error(`${name} is required`);
	return value;
}

export function loadServerConfig(env: Env) {
	const ttl = env.JWT_TTL_SECONDS;
	if (ttl !== undefined && ttl !== String(TOKEN_TTL_SECONDS)) {
		throw new Error(
			`JWT_TTL_SECONDS must be unset or ${TOKEN_TTL_SECONDS}; the lifetime is fixed by D-05.`,
		);
	}
	const secret = required(env, "JWT_SECRET");
	if (new TextEncoder().encode(secret).length < 32)
		throw new Error("JWT_SECRET must be at least 32 bytes.");
	return {
		allowedOrigin: required(env, "CORS_ORIGIN"),
		databaseUrl: required(env, "DATABASE_URL"),
		port: Number(env.PORT ?? 3000),
		secureCookie: env.COOKIE_SECURE === "true",
		jwt: {
			secret,
			issuer: env.JWT_ISSUER ?? "pocket-ledger",
			audience: env.JWT_AUDIENCE ?? "pocket-ledger-web",
		},
	};
}
