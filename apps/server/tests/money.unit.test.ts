import { describe, expect, test } from "bun:test";

import {
	allocationEffect,
	bangkokToday,
	deriveBalances,
	formatAmount,
	isCalendarDate,
	parseAmount,
	primaryEffect,
} from "../src/money";

describe("TEST-16 / AC-16 exact THB amounts (D-03)", () => {
	test.each([
		["1200.00", 120000n],
		["1200", 120000n],
		["0.01", 1n],
		["700.5", 70050n],
		["1000000000.00", 100000000000n],
	])("accepts %p as %p satang", (input, minor) => {
		expect(parseAmount(input)).toBe(minor);
	});

	test.each([
		"0",
		"0.00",
		"-5.00",
		"1.234",
		"1000000000.01",
		"01.00",
		"1e3",
		" 1.00",
		"1,200.00",
		"",
	])("rejects %p without rounding", (input) => {
		expect(parseAmount(input)).toBeNull();
	});

	test("rejects non-string amounts", () => {
		expect(parseAmount(1200)).toBeNull();
		expect(parseAmount(null)).toBeNull();
	});

	test("formats satang with two places", () => {
		expect(formatAmount(120000n)).toBe("1200.00");
		expect(formatAmount(5n)).toBe("0.05");
		expect(formatAmount(-70000n)).toBe("-700.00");
	});
});

describe("D-04 calendar dates", () => {
	test("accepts real YYYY-MM-DD dates only", () => {
		expect(isCalendarDate("2026-11-15")).toBe(true);
		expect(isCalendarDate("2028-02-29")).toBe(true);
		expect(isCalendarDate("2026-02-30")).toBe(false);
		expect(isCalendarDate("2026-1-5")).toBe(false);
		expect(isCalendarDate("15/11/2026")).toBe(false);
	});

	test("today is the Asia/Bangkok calendar date", () => {
		// 2026-11-15T18:30Z is 01:30 on 16 November in Bangkok (UTC+7).
		expect(bangkokToday(new Date("2026-11-15T18:30:00Z"))).toBe("2026-11-16");
		expect(bangkokToday(new Date("2026-11-15T16:59:59Z"))).toBe("2026-11-15");
	});
});

describe("System SDS effect matrix", () => {
	test("PAYMENT primary: Cash pays out, Loan Taken (card) records a charge", () => {
		expect(primaryEffect("PAYMENT", "CASH")).toBe(-1n);
		expect(primaryEffect("PAYMENT", "LOAN_TAKEN")).toBe(1n);
		expect(primaryEffect("PAYMENT", "EXPENSE")).toBeNull();
		expect(primaryEffect("PAYMENT", "INCOME")).toBeNull();
		expect(primaryEffect("PAYMENT", "LOAN_GIVEN")).toBeNull();
		expect(primaryEffect("RECEIVE", "CASH")).toBe(1n);
		expect(primaryEffect("RECEIVE", "LOAN_TAKEN")).toBeNull();
	});

	test("allocation types allowed per form", () => {
		expect(allocationEffect("PAYMENT", "EXPENSE")).toBe(1n);
		expect(allocationEffect("PAYMENT", "LOAN_TAKEN")).toBe(-1n);
		expect(allocationEffect("PAYMENT", "INCOME")).toBeNull();
		expect(allocationEffect("RECEIVE", "INCOME")).toBe(1n);
		expect(allocationEffect("RECEIVE", "EXPENSE")).toBeNull();
	});
});

describe("TEST-22 / AC-22 derived balances (unit, independent expected values)", () => {
	test("opening 10,000, salary 20,000, card charge 700+500, repayment 500", () => {
		const accounts = [
			{ id: "bank", type: "CASH" as const, openingAmountSatang: 1_000_000n },
			{ id: "card", type: "LOAN_TAKEN" as const, openingAmountSatang: 0n },
			{ id: "salary", type: "INCOME" as const, openingAmountSatang: 0n },
			{ id: "dining", type: "EXPENSE" as const, openingAmountSatang: 0n },
			{ id: "groceries", type: "EXPENSE" as const, openingAmountSatang: 0n },
		];
		const balances = deriveBalances(accounts, [
			{
				form: "RECEIVE",
				primaryAccountId: "bank",
				totalSatang: 2_000_000n,
				allocations: [{ accountId: "salary", amountSatang: 2_000_000n }],
			},
			{
				form: "PAYMENT",
				primaryAccountId: "card",
				totalSatang: 120_000n,
				allocations: [
					{ accountId: "dining", amountSatang: 70_000n },
					{ accountId: "groceries", amountSatang: 50_000n },
				],
			},
			{
				form: "PAYMENT",
				primaryAccountId: "bank",
				totalSatang: 50_000n,
				allocations: [{ accountId: "card", amountSatang: 50_000n }],
			},
		]);
		expect(Object.fromEntries(balances)).toEqual({
			bank: 2_950_000n,
			card: 70_000n,
			salary: 2_000_000n,
			dining: 70_000n,
			groceries: 50_000n,
		});
	});
});
