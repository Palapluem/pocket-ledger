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

const post = (body: unknown, cookie = alice) =>
	f.send("POST", "/api/transactions", { body, cookie });

type FinanceAccountIds = Awaited<
	ReturnType<typeof financeFixture>
>["accounts"]["userA"];
type ReceiveOverrides = {
	primaryAccountId?: string;
	date?: unknown;
	total?: unknown;
	allocationAmount?: unknown;
	allocations?: unknown;
};

const salaryReceipt = (
	accounts: FinanceAccountIds,
	overrides: ReceiveOverrides = {},
) => ({
	form: "RECEIVE",
	primaryAccountId: overrides.primaryAccountId ?? accounts.Bank,
	date: overrides.date ?? "2026-11-02",
	total: overrides.total ?? "20000.00",
	allocations: overrides.allocations ?? [
		{
			accountId: accounts.Salary,
			amount: overrides.allocationAmount ?? overrides.total ?? "20000.00",
		},
	],
});

const setOpeningThroughApi = (
	accountId: string,
	cookie = alice,
	amount = "10000.00",
	date = "2026-11-01",
) =>
	f.send("PUT", `/api/accounts/${accountId}/opening-balance`, {
		body: { amount, date },
		cookie,
	});

const bangkokDateForTest = () => {
	const parts = new Intl.DateTimeFormat("en", {
		timeZone: "Asia/Bangkok",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((item) => item.type === type)?.value;
	const year = part("year");
	const month = part("month");
	const day = part("day");
	if (!year || !month || !day)
		throw new Error("Could not determine test date.");
	return `${year}-${month}-${day}`;
};

const addCalendarDays = (date: string, days: number) => {
	const result = new Date(`${date}T00:00:00.000Z`);
	result.setUTCDate(result.getUTCDate() + days);
	return result.toISOString().slice(0, 10);
};

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

describe("TEST-15 / AC-15 account types and references", () => {
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

	test("RECEIVE requires a Cash primary account and Income-only allocations", async () => {
		const a = f.accounts.userA;
		const invalidCases: [string, unknown, string][] = [
			[
				"Loan Taken primary",
				salaryReceipt(a, { primaryAccountId: a["Credit card"], total: "1.00" }),
				"RULE_VIOLATION",
			],
			[
				"Income primary",
				salaryReceipt(a, { primaryAccountId: a.Salary, total: "1.00" }),
				"RULE_VIOLATION",
			],
			[
				"Expense primary",
				salaryReceipt(a, { primaryAccountId: a.Dining, total: "1.00" }),
				"RULE_VIOLATION",
			],
			[
				"Cash allocation",
				salaryReceipt(a, {
					total: "1.00",
					allocations: [{ accountId: a.Bank, amount: "1.00" }],
				}),
				"RULE_VIOLATION",
			],
			[
				"Loan Taken allocation",
				salaryReceipt(a, {
					total: "1.00",
					allocations: [{ accountId: a["Credit card"], amount: "1.00" }],
				}),
				"RULE_VIOLATION",
			],
			[
				"Expense allocation",
				salaryReceipt(a, {
					total: "1.00",
					allocations: [{ accountId: a.Dining, amount: "1.00" }],
				}),
				"RULE_VIOLATION",
			],
			[
				"duplicate Income allocations",
				salaryReceipt(a, {
					total: "2.00",
					allocations: [
						{ accountId: a.Salary, amount: "1.00" },
						{ accountId: a.Salary, amount: "1.00" },
					],
				}),
				"RULE_VIOLATION",
			],
			[
				"primary account repeated as an allocation",
				salaryReceipt(a, {
					total: "1.00",
					allocations: [{ accountId: a.Bank, amount: "1.00" }],
				}),
				"RULE_VIOLATION",
			],
			[
				"another User's Income allocation",
				salaryReceipt(a, {
					total: "1.00",
					allocations: [{ accountId: f.accounts.userB.Salary, amount: "1.00" }],
				}),
				"NOT_FOUND",
			],
		];

		for (const [label, body, code] of invalidCases) {
			const response = await post(body);
			const expectedStatus = code === "NOT_FOUND" ? 404 : 422;
			if (response.status !== expectedStatus)
				throw new Error(
					`${label}: expected HTTP ${expectedStatus}, got ${response.status}.`,
				);
			expect(await response.json()).toMatchObject({ code });
		}
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
	});
});

describe("TEST-16 / AC-16 PAYMENT and RECEIVE amount/date inputs", () => {
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
		const tomorrow = addCalendarDays(bangkokDateForTest(), 1);
		const res = await post(
			cardCharge(f.accounts.userA, {
				date: tomorrow,
			}),
		);
		expect(res.status).toBe(422);
		expect(await res.json()).toMatchObject({ code: "INVALID_DATE" });
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
	});

	test("today in Asia/Bangkok is accepted", async () => {
		const res = await post(
			cardCharge(f.accounts.userA, { date: bangkokDateForTest() }),
		);
		expect(res.status).toBe(201);
	});

	test("RECEIVE rejects malformed amounts and calendar dates without writes", async () => {
		const a = f.accounts.userA;
		const invalidTotals: unknown[] = [
			"0.00",
			"-1.00",
			"1.001",
			"1e3",
			"1000000000.01",
			20000,
		];
		for (const total of invalidTotals) {
			const response = await post(
				salaryReceipt(a, { total, allocationAmount: total }),
			);
			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({ code: "INVALID_INPUT" });
		}
		const invalidDate = await post(salaryReceipt(a, { date: "2026-02-30" }));
		expect(invalidDate.status).toBe(400);
		expect(await invalidDate.json()).toMatchObject({ code: "INVALID_INPUT" });
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
	});
});

describe("TEST-10/13/14/24 / AC-10, AC-13, AC-14 and AC-24 RECEIVE behavior", () => {
	test("TEST-13 saves salary after the opening balance and retrieves exact values", async () => {
		const a = f.accounts.userA;
		const opening = await setOpeningThroughApi(a.Bank);
		expect(opening.status).toBe(200);
		const openingRead = await f.send("GET", `/api/accounts/${a.Bank}`, {
			cookie: alice,
		});
		expect(openingRead.status).toBe(200);
		expect(await openingRead.json()).toMatchObject({
			id: a.Bank,
			openingAmount: "10000.00",
			openingDate: "2026-11-01",
			balance: "10000.00",
		});

		const saved = await post(salaryReceipt(a));
		expect(saved.status).toBe(201);
		const transaction = (await saved.json()) as {
			id: string;
			form: string;
			primaryAccountId: string;
			date: string;
			total: string;
			allocations: { accountId: string; amount: string }[];
		};
		expect(transaction).toMatchObject({
			form: "RECEIVE",
			primaryAccountId: a.Bank,
			date: "2026-11-02",
			total: "20000.00",
			allocations: [{ accountId: a.Salary, amount: "20000.00" }],
		});

		const detail = await f.send("GET", `/api/transactions/${transaction.id}`, {
			cookie: alice,
		});
		expect(detail.status).toBe(200);
		expect(await detail.json()).toMatchObject(transaction);
		expect(await f.counts()).toEqual({ transactions: 1, lines: 1 });
		expect(await f.balances(alice)).toEqual({
			Bank: "30000.00",
			"Credit card": "0.00",
			Salary: "20000.00",
			Dining: "0.00",
			Groceries: "0.00",
		});
	});

	test("TEST-14 rejects a mismatched salary allocation without any financial effect", async () => {
		const a = f.accounts.userA;
		expect((await setOpeningThroughApi(a.Bank)).status).toBe(200);
		const before = await f.balances(alice);
		const rejected = await post(
			salaryReceipt(a, {
				total: "20000.00",
				allocationAmount: "19999.99",
			}),
		);
		expect(rejected.status).toBe(422);
		expect(await rejected.json()).toMatchObject({ code: "RULE_VIOLATION" });
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
		expect(await f.balances(alice)).toEqual(before);
		expect(
			await (
				await f.send("GET", "/api/transactions", { cookie: alice })
			).json(),
		).toEqual([]);
	});

	test("TEST-24 accepts the opening date and Bangkok today, but rejects dates outside", async () => {
		const a = f.accounts.userA;
		expect((await setOpeningThroughApi(a.Bank)).status).toBe(200);
		const today = bangkokDateForTest();
		const acceptedDates = ["2026-11-01", today];
		for (const date of acceptedDates) {
			const accepted = await post(
				salaryReceipt(a, { date, total: "1.00", allocationAmount: "1.00" }),
			);
			expect(accepted.status).toBe(201);
		}

		for (const date of ["2026-10-31", addCalendarDays(today, 1)]) {
			const rejected = await post(
				salaryReceipt(a, { date, total: "1.00", allocationAmount: "1.00" }),
			);
			expect(rejected.status).toBe(422);
			expect(await rejected.json()).toMatchObject({ code: "RULE_VIOLATION" });
		}
		expect(await f.counts()).toEqual({ transactions: 2, lines: 2 });
		expect(await f.balances(alice)).toMatchObject({
			Bank: "10002.00",
			Salary: "2.00",
		});
	});

	test("TEST-10 rejects a later opening date after salary and preserves activity", async () => {
		const a = f.accounts.userA;
		expect((await setOpeningThroughApi(a.Bank)).status).toBe(200);
		expect((await post(salaryReceipt(a))).status).toBe(201);

		const invalidMove = await setOpeningThroughApi(
			a.Bank,
			alice,
			"12000.00",
			"2026-11-03",
		);
		expect(invalidMove.status).toBe(422);
		expect(await invalidMove.json()).toMatchObject({ code: "RULE_VIOLATION" });
		const unchanged = await f.send("GET", `/api/accounts/${a.Bank}`, {
			cookie: alice,
		});
		expect(await unchanged.json()).toMatchObject({
			openingAmount: "10000.00",
			openingDate: "2026-11-01",
			balance: "30000.00",
		});

		const allowedMove = await setOpeningThroughApi(
			a.Bank,
			alice,
			"9000.00",
			"2026-11-02",
		);
		expect(allowedMove.status).toBe(200);
		expect(await allowedMove.json()).toMatchObject({
			openingAmount: "9000.00",
			openingDate: "2026-11-02",
			balance: "29000.00",
		});
		expect(await f.balances(alice)).toMatchObject({ Salary: "20000.00" });
		expect(await f.counts()).toEqual({ transactions: 1, lines: 1 });
	});
});
