// Starts the production server for browser tests on the disposable test database only.
import { createDb, schema } from "@pocket-ledger/db";
import { runMigrations } from "@pocket-ledger/db/migrate";
import { seedUsers } from "@pocket-ledger/db/seed";
import { inArray } from "drizzle-orm";
import { E2E_USERS } from "../../../e2e/fixtures";
import { createApp } from "../src/app";
import {
	assertDisposableTestDatabase,
	assertOwnedTestDatabase,
} from "./helpers";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required");
assertDisposableTestDatabase(url);
const port = Number(process.env.E2E_PORT ?? 4173);

const db = createDb(url);
await assertOwnedTestDatabase(db);
await runMigrations(url);
// Remove only the E2E-owned fixture users, then recreate them with known passwords.
await db.delete(schema.users).where(
	inArray(
		schema.users.email,
		Object.values(E2E_USERS).map((u) => u.email),
	),
);
await seedUsers(url, Object.values(E2E_USERS));

createApp({
	db,
	jwt: {
		secret: "e2e-only-secret-that-is-at-least-32-characters",
		issuer: "pocket-ledger",
		audience: "pocket-ledger-web",
	},
	allowedOrigin: `http://localhost:${port}`,
	commit: "e2e",
	webDir: new URL("../../web/dist", import.meta.url).pathname,
}).listen({ port, hostname: "127.0.0.1" });
console.log(`e2e server on ${port}`);
