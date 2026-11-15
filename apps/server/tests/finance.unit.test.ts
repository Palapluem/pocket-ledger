import { describe, expect, test } from "bun:test";

import {
	allocationBalanceEffect,
	bangkokToday,
	deriveBalances,
	formatMoney,
	isAllowedAllocation,
	isAllowedPrimary,
	isCalendarDate,
	parseMoney,
	primaryBalanceEffect,
} from "../src/finance";

describe("exact THB and calendar date rules", () => {
	test("parses decimal strings into integer satang without rounding", () => {
		expect(parseMoney("0")).toBe(0n);
		expect(parseMoney("0.01")).toBe(1n);
		expect(parseMoney("1.2")).toBe(120n);
		expect(parseMoney("10000.00")).toBe(1_000_000n);
		expect(parseMoney("1000000000.00")).toBe(100_000_000_000n);
		expect(parseMoney("1.001")).toBeNull();
		expect(parseMoney("-1.00")).toBeNull();
		expect(parseMoney("1e3")).toBeNull();
		expect(parseMoney("92233720368547759.00")).toBeNull();
		expect(formatMoney(1_000_001n)).toBe("10000.01");
	});

	test("accepts real calendar dates and uses the Bangkok day boundary", () => {
		expect(isCalendarDate("2026-02-28")).toBe(true);
		expect(isCalendarDate("2026-02-29")).toBe(false);
		expect(isCalendarDate("2024-02-29")).toBe(true);
		expect(isCalendarDate("2026-11-1")).toBe(false);
		expect(bangkokToday(new Date("2026-11-01T18:00:00.000Z"))).toBe(
			"2026-11-02",
		);
	});
});

describe("approved transaction account effects", () => {
	test("restricts primary and allocation account types by form", () => {
		expect(isAllowedPrimary("RECEIVE", "CASH")).toBe(true);
		expect(isAllowedPrimary("RECEIVE", "LOAN_TAKEN")).toBe(false);
		expect(isAllowedPrimary("PAYMENT", "LOAN_TAKEN")).toBe(true);
		expect(isAllowedPrimary("PAYMENT", "INCOME")).toBe(false);
		expect(isAllowedAllocation("RECEIVE", "INCOME")).toBe(true);
		expect(isAllowedAllocation("PAYMENT", "EXPENSE")).toBe(true);
		expect(isAllowedAllocation("PAYMENT", "INCOME")).toBe(false);
	});

	test("calculates each approved primary and allocation sign exactly", () => {
		const total = 120_000n;
		expect(primaryBalanceEffect("PAYMENT", "CASH", total)).toBe(-total);
		expect(primaryBalanceEffect("PAYMENT", "LOAN_TAKEN", total)).toBe(total);
		expect(primaryBalanceEffect("RECEIVE", "CASH", total)).toBe(total);
		expect(allocationBalanceEffect("PAYMENT", "EXPENSE", 70_000n)).toBe(
			70_000n,
		);
		expect(allocationBalanceEffect("PAYMENT", "LOAN_TAKEN", 50_000n)).toBe(
			-50_000n,
		);
		expect(allocationBalanceEffect("RECEIVE", "INCOME", total)).toBe(total);
		expect(allocationBalanceEffect("RECEIVE", "LOAN_GIVEN", total)).toBe(
			-total,
		);
		expect(allocationBalanceEffect("RECEIVE", "CASH", total)).toBe(-total);
	});

	test("derives the independently specified receive balances from persisted effects", () => {
		const balances = deriveBalances(
			[
				{ id: "bank", type: "CASH", openingAmountSatang: 1_000_000n },
				{ id: "salary", type: "INCOME", openingAmountSatang: 0n },
			],
			[
				{
					id: "salary-receipt",
					form: "RECEIVE",
					primaryAccountId: "bank",
					totalSatang: 2_000_000n,
				},
			],
			[
				{
					transactionId: "salary-receipt",
					accountId: "salary",
					amountSatang: 2_000_000n,
				},
			],
		);
		expect(balances.get("bank")).toBe(3_000_000n);
		expect(balances.get("salary")).toBe(2_000_000n);
	});
});
