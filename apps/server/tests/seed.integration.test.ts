import { beforeEach, describe, expect, test } from "bun:test";
import { createDb, schema } from "@pocket-ledger/db";
import { runMigrations } from "@pocket-ledger/db/migrate";
import { seedStarterAccounts, seedUsers } from "@pocket-ledger/db/seed";
import { eq, sql } from "drizzle-orm";

import journal from "../../../packages/db/src/migrations/meta/_journal.json";

import {
	assertOwnedTestDatabase,
	resetDatabase,
	testDatabaseUrl,
} from "./helpers";

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
	expect(await seedStarterAccounts(testDatabaseUrl())).toBe(5);
	const [firstRow] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, "seed.user@example.test"));
	if (!firstRow) throw new Error("seeded user missing");
	const first = firstRow;
	const userAccounts = await db
		.select()
		.from(schema.accounts)
		.where(eq(schema.accounts.ownerId, first.id));
	const bank = userAccounts.find((account) => account.type === "CASH");
	if (!bank) throw new Error("seeded user's financial accounts missing");
	const salary = userAccounts.find((account) => account.type === "INCOME");
	if (!salary) throw new Error("seeded user's salary account is missing");
	expect(userAccounts).toHaveLength(5);
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
	const [savedTransaction] = await db
		.insert(schema.transactions)
		.values({
			ownerId: first.id,
			form: "RECEIVE",
			primaryAccountId: bank.id,
			occurredOn: "2026-11-02",
			totalSatang: 2_000_000n,
			memo: "Seed preservation check",
		})
		.returning();
	if (!savedTransaction) throw new Error("test transaction was not saved");
	await db.insert(schema.transactionAllocations).values({
		ownerId: first.id,
		transactionId: savedTransaction.id,
		accountId: salary.id,
		amountSatang: 2_000_000n,
		position: 0,
	});

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
	).toHaveLength(5);
	expect(
		await db
			.select()
			.from(schema.transactions)
			.where(eq(schema.transactions.ownerId, first.id)),
	).toMatchObject([
		{
			id: savedTransaction.id,
			totalSatang: 2_000_000n,
			memo: "Seed preservation check",
		},
	]);
	expect(
		await db
			.select()
			.from(schema.transactionAllocations)
			.where(
				eq(schema.transactionAllocations.transactionId, savedTransaction.id),
			),
	).toMatchObject([{ accountId: salary.id, amountSatang: 2_000_000n }]);
	expect(first.passwordHash.startsWith("$argon2id$")).toBe(true);
});

describe("TEST-09 / AC-09 starter financial accounts (seed)", () => {
	test("each User gets the starter accounts once; reseeding keeps existing financial data", async () => {
		const url = testDatabaseUrl();
		await seedUsers(url, seeds);
		const first = await seedStarterAccounts(url);
		const accounts = await db.select().from(schema.accounts);
		const users = await db
			.select()
			.from(schema.users)
			.where(eq(schema.users.role, "user"));
		expect(first).toBe(users.length * 5);
		expect(accounts.length).toBe(first);
		expect(
			accounts.filter((a) => a.name === "Bank").every((a) => a.type === "CASH"),
		).toBe(true);

		const bank = accounts.find((a) => a.name === "Bank");
		if (!bank) throw new Error("starter Bank account missing");
		await db
			.update(schema.accounts)
			.set({ openingAmountSatang: 1_000_000n, openingDate: "2026-11-01" })
			.where(eq(schema.accounts.id, bank.id));
		const dining = accounts.find(
			(a) => a.ownerId === bank.ownerId && a.name === "Dining",
		);
		if (!dining) throw new Error("starter Dining account missing");
		const [saved] = await db
			.insert(schema.transactions)
			.values({
				ownerId: bank.ownerId,
				form: "PAYMENT",
				primaryAccountId: bank.id,
				occurredOn: "2026-11-02",
				totalSatang: 10_000n,
			})
			.returning();
		if (!saved) throw new Error("transaction not saved");
		await db.insert(schema.transactionAllocations).values({
			ownerId: bank.ownerId,
			transactionId: saved.id,
			accountId: dining.id,
			amountSatang: 10_000n,
			position: 0,
		});

		expect(await seedStarterAccounts(url)).toBe(0);
		const [bankAfter] = await db
			.select()
			.from(schema.accounts)
			.where(eq(schema.accounts.id, bank.id));
		expect(bankAfter?.openingAmountSatang).toBe(1_000_000n);
		// Bun SQL returns `date` as a Date at UTC midnight; compare the calendar day.
		const opening = bankAfter?.openingDate as unknown as Date | string;
		expect(
			typeof opening === "string"
				? opening
				: opening.toISOString().slice(0, 10),
		).toBe("2026-11-01");
		expect(await db.select().from(schema.transactions)).toHaveLength(1);
		expect(await db.select().from(schema.transactionAllocations)).toHaveLength(
			1,
		);
	});

	test("disabled Users do not receive new starter accounts", async () => {
		const url = testDatabaseUrl();
		await seedUsers(url, seeds);
		await db
			.update(schema.users)
			.set({ enabled: false })
			.where(eq(schema.users.email, "seed.user@example.test"));

		expect(await seedStarterAccounts(url)).toBe(0);
		expect(await db.select().from(schema.accounts)).toHaveLength(0);
	});
});

describe("migrations under concurrent container starts", () => {
	test("three runs started together on a fresh database all succeed and apply each migration once", async () => {
		// A scratch database inside the owned test server, so the shared fixture database
		// and its cached types are untouched.
		const owned = createDb(testDatabaseUrl());
		await assertOwnedTestDatabase(owned);
		const scratch = new URL(testDatabaseUrl());
		scratch.pathname = "/pl_migration_race";
		await owned.execute(sql.raw("DROP DATABASE IF EXISTS pl_migration_race"));
		await owned.execute(sql.raw("CREATE DATABASE pl_migration_race"));
		try {
			const results = await Promise.allSettled([
				runMigrations(scratch.href),
				runMigrations(scratch.href),
				runMigrations(scratch.href),
			]);
			expect(results.map((r) => r.status)).toEqual([
				"fulfilled",
				"fulfilled",
				"fulfilled",
			]);
			const fresh = createDb(scratch.href);
			try {
				const rows = (await fresh.execute(
					sql.raw(
						"select count(*)::int as n from drizzle.__drizzle_migrations",
					),
				)) as unknown as { n: number }[];
				expect(rows[0]?.n).toBe(journal.entries.length);
			} finally {
				await fresh.$client.close();
			}
		} finally {
			await owned.execute(
				sql.raw("DROP DATABASE IF EXISTS pl_migration_race WITH (FORCE)"),
			);
			await owned.$client.close();
		}
	});
});
