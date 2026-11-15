import { createDb, schema, type Database } from "./index";
import { and, eq } from "drizzle-orm";

const DEFAULT_FINANCIAL_ACCOUNTS = [
	{ key: "bank", name: "Bank", type: "CASH" },
	{ key: "loan-given", name: "Loan Given", type: "LOAN_GIVEN" },
	{ key: "credit-card", name: "Credit Card", type: "LOAN_TAKEN" },
	{ key: "salary", name: "Salary", type: "INCOME" },
	{ key: "dining", name: "Dining", type: "EXPENSE" },
	{ key: "groceries", name: "Groceries", type: "EXPENSE" },
] as const;

export async function seedFinancialAccounts(db: Database) {
	const identities = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.where(and(eq(schema.users.role, "user"), eq(schema.users.enabled, true)));
	let inserted = 0;
	for (const identity of identities) {
		for (const account of DEFAULT_FINANCIAL_ACCOUNTS) {
			const rows = await db
				.insert(schema.accounts)
				.values({
					ownerId: identity.id,
					key: account.key,
					name: account.name,
					type: account.type,
					currency: "THB",
					openingAmountSatang: 0,
				})
				.onConflictDoNothing({
					target: [schema.accounts.ownerId, schema.accounts.key],
				})
				.returning({ id: schema.accounts.id });
			inserted += rows.length;
		}
	}
	return inserted;
}

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
		await seedFinancialAccounts(db);
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
	process.exit(0);
}
