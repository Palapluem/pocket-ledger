import { beforeEach, expect, test } from "bun:test";
import { schema } from "@pocket-ledger/db";
import { seedUsers } from "@pocket-ledger/db/seed";
import { eq } from "drizzle-orm";

import { resetDatabase, testDatabaseUrl } from "./helpers";

let db: Awaited<ReturnType<typeof resetDatabase>>;
beforeEach(async () => {
	db = await resetDatabase();
	await db.delete(schema.transactionAllocations);
	await db.delete(schema.transactions);
	await db.delete(schema.accounts);
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
	const [bank] = await db
		.select()
		.from(schema.accounts)
		.where(eq(schema.accounts.ownerId, first.id));
	if (!bank) throw new Error("seeded user's financial accounts missing");
	const userAccounts = await db
		.select()
		.from(schema.accounts)
		.where(eq(schema.accounts.ownerId, first.id));
	expect(userAccounts).toHaveLength(6);
	const [admin] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, "seed.admin@example.test"));
	if (!admin) throw new Error("seeded Administrator missing");
	expect(
		await db
			.select()
			.from(schema.accounts)
			.where(eq(schema.accounts.ownerId, admin.id)),
	).toHaveLength(0);
	// Simulate later changes that a rerun must not reset.
	await db
		.update(schema.accounts)
		.set({ openingAmountSatang: 1_000_000n, openingDate: "2026-11-01" })
		.where(eq(schema.accounts.id, bank.id));
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
	const [sameBank] = await db
		.select()
		.from(schema.accounts)
		.where(eq(schema.accounts.id, bank.id));
	if (!sameBank) throw new Error("seeded bank account was removed");
	expect(sameBank).toMatchObject({
		id: bank.id,
		openingAmountSatang: 1_000_000n,
	});
	const openingDate = sameBank.openingDate as unknown as string | Date | null;
	expect(
		openingDate instanceof Date
			? openingDate.toISOString().slice(0, 10)
			: openingDate,
	).toBe("2026-11-01");
	expect(
		await db
			.select()
			.from(schema.accounts)
			.where(eq(schema.accounts.ownerId, first.id)),
	).toHaveLength(6);
	expect(first.passwordHash.startsWith("$argon2id$")).toBe(true);
});
