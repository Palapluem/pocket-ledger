import { beforeEach, describe, expect, test } from "bun:test";

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
});

const summary = async (query = "") =>
	(await (
		await f.send("GET", `/api/summary${query}`, { cookie: alice })
	).json()) as Record<string, unknown>;

describe("TEST-11 / AC-11 opening balance is not income or expense", () => {
	test("with only an opening balance, income and expense are zero", async () => {
		await f.setOpening(f.accounts.userA.Bank, 1_000_000n);
		expect(await summary()).toMatchObject({ income: "0.00", expense: "0.00" });
		expect((await f.balances(alice)).Bank).toBe("10000.00");
	});
});

describe("TEST-22 / AC-22 the agreed Sprint 1 fixture", () => {
	test("bank 29,500, card debt 700, Income 20,000, Expense 1,200", async () => {
		// Step 1 is setup (F-03 opening-balance API is Issue #20); steps 2-4 use the API.
		await f.setOpening(f.accounts.userA.Bank, 1_000_000n);
		for (const body of [
			salary(f.accounts.userA),
			cardCharge(f.accounts.userA),
			repayment(f.accounts.userA),
		]) {
			const res = await f.send("POST", "/api/transactions", {
				body,
				cookie: alice,
			});
			expect(res.status).toBe(201);
		}

		const result = await summary();
		expect(result.income).toBe("20000.00");
		expect(result.expense).toBe("1200.00");
		expect(await f.balances(alice)).toEqual({
			Bank: "29500.00",
			"Credit card": "700.00",
			Salary: "20000.00",
			Dining: "700.00",
			Groceries: "500.00",
		});
	});
});
