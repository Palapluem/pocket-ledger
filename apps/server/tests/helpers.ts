import { runMigrations } from "@pocket-ledger/db/migrate";
import { createDb, schema } from "@pocket-ledger/db";

export const TEST_JWT = {
	secret: "test-only-secret-that-is-at-least-32-characters-long",
	issuer: "pocket-ledger",
	audience: "pocket-ledger-web",
	ttlSeconds: 3600,
};
export const ALLOWED_ORIGIN = "http://localhost:3001";

export const FIXTURE = {
	userA: { email: "alice@example.test", displayName: "Alice", role: "user" as const, password: "alice-pass-1" },
	userB: { email: "bob@example.test", displayName: "Bob", role: "user" as const, password: "bob-pass-2" },
	admin: { email: "admin@example.test", displayName: "Admin", role: "administrator" as const, password: "admin-pass-3" },
	disabled: { email: "dora@example.test", displayName: "Dora", role: "user" as const, password: "dora-pass-4" },
};

export function testDatabaseUrl() {
	const url = process.env.TEST_DATABASE_URL;
	if (!url) throw new Error("TEST_DATABASE_URL is required (see scripts/test-db.sh)");
	return url;
}

export async function resetDatabase() {
	const url = testDatabaseUrl();
	await runMigrations(url);
	const db = createDb(url);
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
