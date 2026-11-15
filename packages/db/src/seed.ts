import { eq } from "drizzle-orm";

import { createDb, schema } from "./index";
import type { AccountType } from "./schema";

export type SeedUser = {
	email: string;
	displayName: string;
	role: "user" | "administrator";
	password: string;
};

/**
 * Idempotent: inserts only users whose email does not exist yet. An existing user's
 * password, role, enabled state and data are never changed.
 */
export async function seedUsers(databaseUrl: string, seeds: SeedUser[]) {
	const db = createDb(databaseUrl);
	let inserted = 0;
	try {
		for (const seed of seeds) {
			const rows = await db
				.insert(schema.users)
				.values({
					email: seed.email.trim().toLowerCase(),
					displayName: seed.displayName,
					role: seed.role,
					passwordHash: await Bun.password.hash(seed.password, "argon2id"),
				})
				.onConflictDoNothing({ target: schema.users.email })
				.returning({ id: schema.users.id });
			inserted += rows.length;
		}
	} finally {
		await db.$client.close();
	}
	return inserted;
}

/** Sprint 1 starter accounts for every User (D-06): seeded, opening balance zero. */
export const STARTER_ACCOUNTS: { name: string; type: AccountType }[] = [
	{ name: "Bank", type: "CASH" },
	{ name: "Credit card", type: "LOAN_TAKEN" },
	{ name: "Salary", type: "INCOME" },
	{ name: "Dining", type: "EXPENSE" },
	{ name: "Groceries", type: "EXPENSE" },
];

/** Today's calendar date in Asia/Bangkok (D-04), as YYYY-MM-DD. */
export const bangkokToday = (now = new Date()) =>
	new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);

/**
 * Idempotent: gives every User any missing starter account (matched by owner and name).
 * Existing accounts, opening balances and transactions are never changed.
 */
export async function seedStarterAccounts(databaseUrl: string) {
	const db = createDb(databaseUrl);
	let inserted = 0;
	try {
		const owners = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.role, "user"));
		for (const owner of owners) {
			const rows = await db
				.insert(schema.financialAccounts)
				.values(
					STARTER_ACCOUNTS.map((a) => ({
						ownerId: owner.id,
						name: a.name,
						type: a.type,
						openingDate: bangkokToday(),
					})),
				)
				.onConflictDoNothing({
					target: [
						schema.financialAccounts.ownerId,
						schema.financialAccounts.name,
					],
				})
				.returning({ id: schema.financialAccounts.id });
			inserted += rows.length;
		}
	} finally {
		await db.$client.close();
	}
	return inserted;
}

if (import.meta.main) {
	const url = process.env.DATABASE_URL;
	const raw = process.env.SEED_USERS_JSON;
	if (!url || !raw)
		throw new Error("DATABASE_URL and SEED_USERS_JSON are required");
	const count = await seedUsers(url, JSON.parse(raw) as SeedUser[]);
	console.log(`Seeded ${count} new user(s)`);
	const accounts = await seedStarterAccounts(url);
	console.log(`Seeded ${accounts} new financial account(s)`);
	process.exit(0);
}
