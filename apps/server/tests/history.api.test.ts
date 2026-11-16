import { beforeEach, describe, expect, test } from "bun:test";
import { schema } from "@pocket-ledger/db";
import { eq } from "drizzle-orm";

import { bangkokToday } from "../src/money";
import {
	cardCharge,
	financeFixture,
	repayment,
	salary,
} from "./finance-helpers";

let f: Awaited<ReturnType<typeof financeFixture>>;
let alice: string;

beforeEach(async () => {
	f = await financeFixture();
	alice = await f.login("userA");
	await f.setOpening(f.accounts.userA.Bank, 1_000_000n);
});

const post = (body: unknown) =>
	f.send("POST", "/api/transactions", { body, cookie: alice });
const get = async (path: string) => {
	const res = await f.send("GET", path, { cookie: alice });
	return { status: res.status, body: (await res.json()) as never };
};

describe("TEST-23 / AC-23 history and detail from fresh reads", () => {
	test("list is newest date first with complete allocations in saved order", async () => {
		for (const body of [
			salary(f.accounts.userA),
			cardCharge(f.accounts.userA),
			repayment(f.accounts.userA),
		])
			expect((await post(body)).status).toBe(201);

		const { status, body } = await get("/api/transactions");
		expect(status).toBe(200);
		const list = body as {
			id: string;
			date: string;
			total: string;
			allocations: { accountId: string; amount: string }[];
		}[];
		expect(list.map((t) => [t.date, t.total])).toEqual([
			["2026-11-04", "500.00"],
			["2026-11-03", "1200.00"],
			["2026-11-02", "20000.00"],
		]);
		expect(list[1]?.allocations).toEqual([
			{ accountId: f.accounts.userA.Dining, amount: "700.00" },
			{ accountId: f.accounts.userA.Groceries, amount: "500.00" },
		]);

		const detail = await get(`/api/transactions/${list[1]?.id}`);
		expect(detail.status).toBe(200);
		expect(detail.body).toEqual(list[1] as never);
	});

	test("an unknown or malformed transaction id is a safe not-found", async () => {
		expect((await get("/api/transactions/not-a-uuid")).status).toBe(404);
		expect(
			(await get("/api/transactions/00000000-0000-4000-8000-000000000000"))
				.status,
		).toBe(404);
	});
});

describe("TEST-24 / AC-24 opening and reporting date boundaries (D-04)", () => {
	test("a payment on the primary account's opening date is accepted", async () => {
		const res = await post(
			cardCharge(f.accounts.userA, { date: "2026-11-01" }),
		);
		expect(res.status).toBe(201);
	});

	test("a payment before the primary account's opening date is rejected", async () => {
		const res = await post(
			cardCharge(f.accounts.userA, { date: "2026-10-31" }),
		);
		expect(res.status).toBe(422);
		expect(await res.json()).toMatchObject({ code: "INVALID_DATE" });
	});

	test("an allocation's balance account opening date also bounds the date", async () => {
		expect((await post(cardCharge(f.accounts.userA))).status).toBe(201);
		// The card (an allocation of the repayment) opened later than the bank.
		await f.setOpening(f.accounts.userA["Credit card"], 0n, "2026-11-03");
		const early = await post(repayment(f.accounts.userA, "100.00"));
		expect(early.status).toBe(201); // 2026-11-04 is after both opening dates
		const before = await post({
			...repayment(f.accounts.userA, "100.00"),
			date: "2026-11-02",
		});
		expect(before.status).toBe(422);
		expect(await before.json()).toMatchObject({ code: "INVALID_DATE" });
	});

	test("a balance account without an opening date cannot be used yet", async () => {
		await f.db
			.update(schema.accounts)
			.set({ openingDate: null })
			.where(eq(schema.accounts.id, f.accounts.userA["Credit card"]));
		const res = await post(cardCharge(f.accounts.userA));
		expect(res.status).toBe(422);
		expect(await res.json()).toMatchObject({ code: "INVALID_DATE" });
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
	});

	test("Income/Expense classification accounts impose no opening-date cutoff", async () => {
		await f.setOpening(f.accounts.userA.Dining, 0n, bangkokToday());
		const res = await post(
			cardCharge(f.accounts.userA, {
				total: "700.00",
				allocations: [{ accountId: f.accounts.userA.Dining, amount: "700.00" }],
			}),
		);
		expect(res.status).toBe(201);
	});

	test("summary ranges are inclusive at both ends", async () => {
		for (const date of ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"])
			expect(
				(
					await post(
						cardCharge(f.accounts.userA, {
							date,
							total: "100.00",
							allocations: [
								{ accountId: f.accounts.userA.Dining, amount: "100.00" },
							],
						}),
					)
				).status,
			).toBe(201);
		const { status, body } = await get(
			"/api/summary?from=2026-11-03&to=2026-11-04",
		);
		expect(status).toBe(200);
		expect(body).toMatchObject({
			from: "2026-11-03",
			to: "2026-11-04",
			expense: "200.00",
			income: "0.00",
		});
	});

	test.each([
		["from after to", "?from=2026-11-05&to=2026-11-04"],
		["impossible date", "?from=2026-02-30&to=2026-03-01"],
		["only one bound", "?from=2026-11-01"],
	])("invalid range (%s) fails safely", async (_name, query) => {
		const { status, body } = await get(`/api/summary${query}`);
		expect(status).toBe(400);
		expect(body).toMatchObject({ code: "INVALID_RANGE" });
	});
});
