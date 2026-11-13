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

if (import.meta.main) {
	const url = process.env.DATABASE_URL;
	const raw = process.env.SEED_USERS_JSON;
	if (!url || !raw)
		throw new Error("DATABASE_URL and SEED_USERS_JSON are required");
	const count = await seedUsers(url, JSON.parse(raw) as SeedUser[]);
	console.log(`Seeded ${count} new user(s)`);
	process.exit(0);
}
