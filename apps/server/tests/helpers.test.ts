import { describe, expect, test } from "bun:test";

import { assertDisposableTestDatabase } from "./helpers";

const OWNED = "postgresql://postgres:pw@127.0.0.1:55432/pocket_ledger_test";

describe("test database safety guard", () => {
	test("accepts only the database and port created by scripts/test-db.sh", () => {
		expect(() => assertDisposableTestDatabase(OWNED, {})).not.toThrow();
		expect(() =>
			assertDisposableTestDatabase(
				"postgres://u:pw@localhost:55432/pocket_ledger_test",
				{},
			),
		).not.toThrow();
	});
	test("respects the script's explicit TEST_DB_PORT", () => {
		const url = "postgresql://postgres:pw@127.0.0.1:56000/pocket_ledger_test";
		expect(() =>
			assertDisposableTestDatabase(url, { TEST_DB_PORT: "56000" }),
		).not.toThrow();
		expect(() => assertDisposableTestDatabase(url, {})).toThrow();
	});
	test("rejects a local non-owned database, other ports, remote hosts and malformed URLs", () => {
		for (const url of [
			"postgresql://postgres:pw@127.0.0.1:55432/ledger_test",
			"postgresql://postgres:pw@127.0.0.1:55432/other_test",
			"postgresql://postgres:pw@127.0.0.1:5432/pocket_ledger_test",
			"postgresql://postgres:pw@127.0.0.1:55432/pocket_ledger",
			"postgresql://postgres:pw@127.0.0.1:55432/postgres",
			"postgresql://postgres:pw@127.0.0.1/pocket_ledger_test",
			"postgresql://postgres:pw@db.example.com:55432/pocket_ledger_test",
			"mysql://root:pw@127.0.0.1:55432/pocket_ledger_test",
			"not a url",
			"",
		]) {
			expect(() => assertDisposableTestDatabase(url, {})).toThrow();
		}
	});
	test("error text never contains the password", () => {
		try {
			assertDisposableTestDatabase(
				"postgresql://postgres:s3cret-pw@db.example.com:5432/prod",
				{},
			);
			throw new Error("should have thrown");
		} catch (e) {
			expect(String(e)).not.toContain("s3cret-pw");
		}
	});
});
