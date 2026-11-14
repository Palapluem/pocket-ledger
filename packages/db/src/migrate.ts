import { migrate } from "drizzle-orm/bun-sql/migrator";

import { createDb } from "./index";

export async function runMigrations(databaseUrl: string) {
	const db = createDb(databaseUrl);
	try {
		await migrate(db, {
			migrationsFolder: new URL("./migrations", import.meta.url).pathname,
		});
	} finally {
		await db.$client.close();
	}
}

if (import.meta.main) {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error("DATABASE_URL is required");
	await runMigrations(url);
	console.log("Migrations applied");
	process.exit(0);
}
