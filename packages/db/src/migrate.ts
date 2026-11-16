import { SQL } from "bun";
import { migrate } from "drizzle-orm/bun-sql/migrator";

import { createDb } from "./index";

/** Arbitrary constant shared by every PocketLedger migration runner. */
const MIGRATION_LOCK_ID = 7_334_201_001;

/**
 * Applies pending migrations. A database-wide advisory lock serializes concurrent
 * runners (for example two containers starting together), so each migration is applied
 * exactly once and every caller waits until the schema is current.
 */
export async function runMigrations(databaseUrl: string) {
	const lock = new SQL(databaseUrl, { max: 1 });
	const db = createDb(databaseUrl);
	try {
		await lock`select pg_advisory_lock(${MIGRATION_LOCK_ID})`;
		try {
			await migrate(db, {
				migrationsFolder: new URL("./migrations", import.meta.url).pathname,
			});
		} finally {
			await lock`select pg_advisory_unlock(${MIGRATION_LOCK_ID})`;
		}
	} finally {
		await db.$client.close();
		await lock.close();
	}
}

if (import.meta.main) {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("DATABASE_URL is required");
	await runMigrations(url);
	console.log("Migrations applied");
	process.exit(0);
}
