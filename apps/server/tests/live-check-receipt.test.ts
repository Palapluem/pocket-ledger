import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	assertCanRecord,
	type Receipt,
	readReceipt,
	receiptPath,
	requireComplete,
	writeReceipt,
} from "../../../scripts/live-check-receipt";

const dir = () => mkdtempSync(join(tmpdir(), "live-check-receipt-"));
const base: Receipt = {
	status: "pending",
	memo: "Lab 5 C-04 synthetic charge 2026-11-19T00:00:00.000Z",
	startedAt: "2026-11-19T00:00:00.000Z",
};

describe("Lab 5 live-check receipt (production retry safety)", () => {
	test("pending and incomplete receipts block another record and a verify", () => {
		const file = receiptPath(dir());
		for (const receipt of [
			base,
			{ ...base, status: "incomplete" as const, id: "tx-1" },
		]) {
			writeReceipt(file, receipt);
			const read = readReceipt(file);
			expect(read).toEqual(receipt);
			expect(() => assertCanRecord(file, read)).toThrow(
				/No new transaction was created. Run `reconcile`/,
			);
			expect(() => requireComplete(file, read)).toThrow(/run `reconcile`/);
		}
	});

	test("a complete receipt blocks another record and is accepted by verify", () => {
		const file = receiptPath(dir());
		const complete: Receipt = {
			...base,
			status: "complete",
			id: "tx-1",
			detail: { id: "tx-1" },
			summary: { expense: "1200.00" },
		};
		writeReceipt(file, complete);
		expect(() => assertCanRecord(file, readReceipt(file))).toThrow(
			/complete C-05 baseline/,
		);
		expect(requireComplete(file, readReceipt(file)).id).toBe("tx-1");
	});

	test("no receipt allows record and makes verify fail", () => {
		const file = receiptPath(dir());
		expect(readReceipt(file)).toBeUndefined();
		expect(() => assertCanRecord(file, undefined)).not.toThrow();
		expect(() => requireComplete(file, undefined)).toThrow(/run `record`/);
	});

	test("a baseline written before receipts had a status is read as complete", () => {
		const file = receiptPath(dir());
		writeFileSync(
			file,
			JSON.stringify({
				recordedAt: "2026-11-18T12:51:53.000Z",
				id: "62b441fb",
				memo: base.memo,
				detail: { id: "62b441fb" },
				summary: { expense: "1200.00" },
			}),
		);
		const read = readReceipt(file);
		expect(read?.status).toBe("complete");
		expect(requireComplete(file, read).id).toBe("62b441fb");
	});

	test("an unrecognisable file is rejected instead of being treated as a baseline", () => {
		const file = receiptPath(dir());
		writeFileSync(file, JSON.stringify({ id: "x" }));
		expect(() => readReceipt(file)).toThrow(/not a recognisable receipt/);
	});

	test("writes are atomic: no temporary file is left behind", () => {
		const file = receiptPath(dir());
		writeReceipt(file, base);
		expect(existsSync(`${file}.tmp`)).toBe(false);
		expect(readReceipt(file)?.status).toBe("pending");
	});
});
