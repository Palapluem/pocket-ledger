import { createDb, schema } from "@pocket-ledger/db";
import { runMigrations } from "@pocket-ledger/db/migrate";

export const TEST_JWT = {
	secret: "test-only-secret-that-is-at-least-32-characters-long",
	issuer: "pocket-ledger",
	audience: "pocket-ledger-web",
};
export const ALLOWED_ORIGIN = "http://localhost:3001";

export const FIXTURE = {
	userA: {
		email: "alice@example.test",
		displayName: "Alice",
		role: "user" as const,
		password: "alice-pass-1",
	},
	userB: {
		email: "bob@example.test",
		displayName: "Bob",
		role: "user" as const,
		password: "bob-pass-2",
	},
	admin: {
		email: "admin@example.test",
		displayName: "Admin",
		role: "administrator" as const,
		password: "admin-pass-3",
	},
	disabled: {
		email: "dora@example.test",
		displayName: "Dora",
		role: "user" as const,
		password: "dora-pass-4",
	},
};

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const OWNED_DATABASE = "pocket_ledger_test";

/**
 * Fail closed: tests migrate and delete rows, so only the disposable database
 * created by scripts/test-db.sh (pocket_ledger_test on its loopback port) is allowed.
 */
export function assertDisposableTestDatabase(
	url: string,
	env: Record<string, string | undefined> = process.env,
) {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error("TEST_DATABASE_URL is not a valid URL.");
	}
	if (!["postgres:", "postgresql:"].includes(parsed.protocol))
		throw new Error("TEST_DATABASE_URL must use the postgres scheme.");
	if (!LOOPBACK_HOSTS.has(parsed.hostname))
		throw new Error("TEST_DATABASE_URL must point at a loopback host.");
	const expectedPort = env.TEST_DB_PORT ?? "55432";
	if (parsed.port !== expectedPort)
		throw new Error(
			`TEST_DATABASE_URL must use port ${expectedPort} from scripts/test-db.sh.`,
		);
	const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
	if (database !== OWNED_DATABASE)
		throw new Error(`TEST_DATABASE_URL database must be ${OWNED_DATABASE}.`);
	return url;
}

export function testDatabaseUrl() {
	const url = process.env.TEST_DATABASE_URL;
	if (!url)
		throw new Error("TEST_DATABASE_URL is required (see scripts/test-db.sh)");
	return assertDisposableTestDatabase(url);
}

let shared: ReturnType<typeof createDb> | undefined;
let migrated: Promise<void> | undefined;

/** Migrates once, reuses one connection pool, and restores the fixture users. */
export async function resetDatabase() {
	const url = testDatabaseUrl();
	migrated ??= runMigrations(url);
	await migrated;
	shared ??= createDb(url);
	const db = shared;
	await db.delete(schema.users);
	for (const [key, u] of Object.entries(FIXTURE)) {
		await db.insert(schema.users).values({
			email: u.email,
			displayName: u.displayName,
			role: u.role,
			enabled: key !== "disabled",
			passwordHash: await Bun.password.hash(u.password, "argon2id"),
		});
	}
	return db;
}
