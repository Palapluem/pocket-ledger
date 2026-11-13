import { beforeEach, expect, test } from "bun:test";
import { schema } from "@pocket-ledger/db";
import { seedUsers } from "@pocket-ledger/db/seed";
import { eq } from "drizzle-orm";

import { resetDatabase, testDatabaseUrl } from "./helpers";

let db: Awaited<ReturnType<typeof resetDatabase>>;
beforeEach(async () => {
	db = await resetDatabase();
	await db.delete(schema.users);
});

const seeds = [
	{
		email: "Seed.User@example.test",
		displayName: "Seed User",
		role: "user" as const,
		password: "seed-pass-1",
	},
	{
		email: "seed.admin@example.test",
		displayName: "Seed Admin",
		role: "administrator" as const,
		password: "seed-pass-2",
	},
];

test("seed creates users once and rerunning changes nothing", async () => {
	expect(await seedUsers(testDatabaseUrl(), seeds)).toBe(2);
	const [firstRow] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, "seed.user@example.test"));
	if (!firstRow) throw new Error("seeded user missing");
	const first = firstRow;
	// Simulate later changes that a rerun must not reset.
	await db
		.update(schema.users)
		.set({ enabled: false, displayName: "Changed" })
		.where(eq(schema.users.id, first.id));

	expect(await seedUsers(testDatabaseUrl(), seeds)).toBe(0);
	const rows = await db.select().from(schema.users);
	expect(rows).toHaveLength(2);
	const [again] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.id, first.id));
	expect(again).toMatchObject({
		enabled: false,
		displayName: "Changed",
		passwordHash: first.passwordHash,
	});
	expect(first.passwordHash.startsWith("$argon2id$")).toBe(true);
});
