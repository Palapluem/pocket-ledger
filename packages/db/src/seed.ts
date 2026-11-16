import { and, eq, inArray } from "drizzle-orm";
import type { AccountType } from "./index";
import { createDb, schema } from "./index";

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
export const STARTER_ACCOUNTS = [
	{ key: "bank", name: "Bank", type: "CASH" },
	{ key: "credit-card", name: "Credit card", type: "LOAN_TAKEN" },
	{ key: "salary", name: "Salary", type: "INCOME" },
	{ key: "dining", name: "Dining", type: "EXPENSE" },
	{ key: "groceries", name: "Groceries", type: "EXPENSE" },
] as const satisfies readonly {
	key: string;
	name: string;
	type: AccountType;
}[];

/** Today's calendar date in Asia/Bangkok (D-04), as YYYY-MM-DD. */
export const bangkokToday = (now = new Date()) =>
	new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);

/**
 * Idempotent: gives every User any missing starter account (matched by owner and account key).
 * Existing accounts, opening balances and transactions are never changed.
 */
export async function seedStarterAccounts(
	databaseUrl: string,
	onlyEmails?: string[],
) {
	const db = createDb(databaseUrl);
	let inserted = 0;
	try {
		const owners = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(
				onlyEmails
					? and(
							eq(schema.users.role, "user"),
							inArray(schema.users.email, onlyEmails),
						)
					: eq(schema.users.role, "user"),
			);
		for (const owner of owners) {
			const rows = await db
				.insert(schema.accounts)
				.values(
					STARTER_ACCOUNTS.map((a) => ({
						ownerId: owner.id,
						key: a.key,
						name: a.name,
						type: a.type,
						openingDate: bangkokToday(),
					})),
				)
				.onConflictDoNothing({
					target: [schema.accounts.ownerId, schema.accounts.key],
				})
				.returning({ id: schema.accounts.id });
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
