import { beforeEach, describe, expect, test } from "bun:test";

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
});

const post = (body: unknown, cookie = alice) =>
	f.send("POST", "/api/transactions", { body, cookie });

describe("TEST-17 / AC-17 split card purchase", () => {
	test("saves both allocations; card debt and Expense grow by 1,200", async () => {
		const res = await post(cardCharge(f.accounts.userA));
		expect(res.status).toBe(201);
		const saved = (await res.json()) as Record<string, unknown>;
		expect(saved).toMatchObject({
			form: "PAYMENT",
			primaryAccountId: f.accounts.userA["Credit card"],
			date: "2026-11-03",
			total: "1200.00",
			allocations: [
				{ accountId: f.accounts.userA.Dining, amount: "700.00" },
				{ accountId: f.accounts.userA.Groceries, amount: "500.00" },
			],
		});
		expect(await f.counts()).toEqual({ transactions: 1, lines: 2 });
		expect(await f.balances(alice)).toEqual({
			Bank: "0.00",
			"Credit card": "1200.00",
			Salary: "0.00",
			Dining: "700.00",
			Groceries: "500.00",
		});
	});
});

describe("TEST-18 / AC-18 bank-to-card repayment", () => {
	test("reduces bank and card debt; income and expense totals do not change", async () => {
		await f.setOpening(f.accounts.userA.Bank, 1_000_000n);
		expect((await post(salary(f.accounts.userA))).status).toBe(201);
		expect((await post(cardCharge(f.accounts.userA))).status).toBe(201);
		const before = await (
			await f.send("GET", "/api/summary", { cookie: alice })
		).json();

		const res = await post(repayment(f.accounts.userA));
		expect(res.status).toBe(201);

		const after = (await (
			await f.send("GET", "/api/summary", { cookie: alice })
		).json()) as Record<string, unknown>;
		expect(after.income).toBe("20000.00");
		expect(after.expense).toBe("1200.00");
		expect(after.income).toBe((before as Record<string, unknown>).income);
		expect(after.expense).toBe((before as Record<string, unknown>).expense);
		const balances = await f.balances(alice);
		expect(balances.Bank).toBe("29500.00");
		expect(balances["Credit card"]).toBe("700.00");
	});
});

describe("TEST-19 / AC-19 mismatched payment allocation", () => {
	test("700 + 400 against 1,200 is rejected with no transaction, line or balance effect", async () => {
		const balancesBefore = await f.balances(alice);
		const res = await post(
			cardCharge(f.accounts.userA, {
				allocations: [
					{ accountId: f.accounts.userA.Dining, amount: "700.00" },
					{ accountId: f.accounts.userA.Groceries, amount: "400.00" },
				],
			}),
		);
		expect(res.status).toBe(422);
		expect(await res.json()).toMatchObject({ code: "ALLOCATION_MISMATCH" });
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
		expect(await f.balances(alice)).toEqual(balancesBefore);
	});
});

describe("TEST-15 / AC-15 payment account types and references", () => {
	const rejects = async (body: unknown, status: number, code: string) => {
		const res = await post(body);
		expect(res.status).toBe(status);
		expect(await res.json()).toMatchObject({ code });
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
	};

	test("an Income allocation is not allowed on a payment", () =>
		rejects(
			cardCharge(f.accounts.userA, {
				total: "700.00",
				allocations: [{ accountId: f.accounts.userA.Salary, amount: "700.00" }],
			}),
			422,
			"INCOMPATIBLE_ACCOUNT",
		));

	test("an Expense primary account is rejected", () =>
		rejects(
			cardCharge(f.accounts.userA, {
				primaryAccountId: f.accounts.userA.Dining,
				total: "500.00",
				allocations: [
					{ accountId: f.accounts.userA.Groceries, amount: "500.00" },
				],
			}),
			422,
			"INCOMPATIBLE_ACCOUNT",
		));

	test("the primary account cannot also be an allocation line", () =>
		rejects(
			cardCharge(f.accounts.userA, {
				allocations: [
					{ accountId: f.accounts.userA["Credit card"], amount: "1200.00" },
				],
			}),
			422,
			"INVALID_ALLOCATION",
		));

	test("an account may appear on only one line", () =>
		rejects(
			cardCharge(f.accounts.userA, {
				allocations: [
					{ accountId: f.accounts.userA.Dining, amount: "700.00" },
					{ accountId: f.accounts.userA.Dining, amount: "500.00" },
				],
			}),
			422,
			"INVALID_ALLOCATION",
		));

	test("a payment needs at least one allocation line", () =>
		rejects(
			cardCharge(f.accounts.userA, { allocations: [] }),
			400,
			"INVALID_INPUT",
		));

	test("repaying more than the card debt is rejected (no overpayment)", async () => {
		await f.setOpening(f.accounts.userA.Bank, 1_000_000n);
		expect((await post(cardCharge(f.accounts.userA))).status).toBe(201);
		const res = await post(repayment(f.accounts.userA, "1200.01"));
		expect(res.status).toBe(422);
		expect(await res.json()).toMatchObject({ code: "INSUFFICIENT_BALANCE" });
		expect(await f.counts()).toEqual({ transactions: 1, lines: 2 });
	});

	test("paying more than the bank holds is rejected (no overdraft)", async () => {
		await f.setOpening(f.accounts.userA.Bank, 30_000n);
		const res = await post({
			form: "PAYMENT",
			primaryAccountId: f.accounts.userA.Bank,
			date: "2026-11-03",
			total: "300.01",
			allocations: [{ accountId: f.accounts.userA.Dining, amount: "300.01" }],
		});
		expect(res.status).toBe(422);
		expect(await res.json()).toMatchObject({ code: "INSUFFICIENT_BALANCE" });
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
	});
});

describe("TEST-16 / AC-16 payment amount and date inputs", () => {
	test.each([
		["excess scale", { total: "1200.001" }],
		["zero", { total: "0.00" }],
		["negative", { total: "-1200.00" }],
		["above the maximum", { total: "1000000000.01" }],
		["number instead of string", { total: 1200 }],
		["impossible date", { date: "2026-02-30" }],
		["unknown form", { form: "TRANSFER" }],
	])("%s is rejected as invalid input", async (_name, override) => {
		const res = await post(cardCharge(f.accounts.userA, override));
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ code: "INVALID_INPUT" });
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
	});

	test("a future date (after today in Asia/Bangkok) is rejected", async () => {
		const tomorrow = new Date(`${bangkokToday()}T00:00:00Z`);
		tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
		const res = await post(
			cardCharge(f.accounts.userA, {
				date: tomorrow.toISOString().slice(0, 10),
			}),
		);
		expect(res.status).toBe(422);
		expect(await res.json()).toMatchObject({ code: "INVALID_DATE" });
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
	});

	test("today in Asia/Bangkok is accepted", async () => {
		const res = await post(
			cardCharge(f.accounts.userA, { date: bangkokToday() }),
		);
		expect(res.status).toBe(201);
	});
});
