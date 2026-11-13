import { describe, expect, test } from "bun:test";

import { assertDisposableTestDatabase } from "./helpers";

describe("test database safety guard", () => {
	test("accepts a loopback URL whose database name ends in _test", () => {
		expect(() =>
			assertDisposableTestDatabase(
				"postgresql://postgres:pw@127.0.0.1:55432/pocket_ledger_test",
			),
		).not.toThrow();
		expect(() =>
			assertDisposableTestDatabase("postgres://u:pw@localhost:5432/other_test"),
		).not.toThrow();
	});
	test("rejects remote hosts, non-test database names and malformed URLs", () => {
		for (const url of [
			"postgresql://postgres:pw@db.example.com:5432/pocket_ledger_test",
			"postgresql://postgres:pw@127.0.0.1:5432/pocket_ledger",
			"postgresql://postgres:pw@127.0.0.1:5432/postgres",
			"postgresql://postgres:pw@127.0.0.1:5432/",
			"mysql://root:pw@127.0.0.1:3306/pocket_ledger_test",
			"not a url",
			"",
		]) {
			expect(() => assertDisposableTestDatabase(url)).toThrow();
		}
	});
	test("error text never contains the password", () => {
		try {
			assertDisposableTestDatabase(
				"postgresql://postgres:s3cret-pw@db.example.com:5432/prod",
			);
		} catch (e) {
			expect(String(e)).not.toContain("s3cret-pw");
		}
	});
});
