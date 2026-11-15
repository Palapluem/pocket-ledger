import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { cardCharge, financeFixture } from "./finance-helpers";

let f: Awaited<ReturnType<typeof financeFixture>>;

beforeEach(async () => {
	f = await financeFixture();
	// Controlled persistence failure: the database itself refuses one specific allocation
	// line, after the transaction row and the first line have already been written.
	await f.db.execute(sql`
		create or replace function test_fail_line() returns trigger language plpgsql as $$
		begin raise exception 'injected persistence failure'; end $$`);
	await f.db.execute(sql`
		create trigger test_fail_line before insert on allocation_lines
		for each row when (new.amount_minor = 50001) execute function test_fail_line()`);
});

afterEach(async () => {
	await f.db.execute(
		sql`drop trigger if exists test_fail_line on allocation_lines`,
	);
	await f.db.execute(sql`drop function if exists test_fail_line()`);
});

describe("TEST-20 / AC-20 a persistence failure rolls back the whole request", () => {
	test("a failing second allocation leaves no transaction, line or balance effect", async () => {
		const alice = await f.login("userA");
		const before = await f.balances(alice);

		const res = await f.send("POST", "/api/transactions", {
			body: cardCharge(f.accounts.userA, {
				total: "1200.01",
				allocations: [
					{ accountId: f.accounts.userA.Dining, amount: "700.00" },
					{ accountId: f.accounts.userA.Groceries, amount: "500.01" },
				],
			}),
			cookie: alice,
		});

		expect(res.status).toBe(500);
		const body = await res.text();
		expect(JSON.parse(body)).toEqual({
			code: "INTERNAL_ERROR",
			message: "The request could not be completed. Nothing was saved.",
		});
		expect(body).not.toContain("injected");
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
		expect(await f.balances(alice)).toEqual(before);
		const history = await f.send("GET", "/api/transactions", { cookie: alice });
		expect(await history.json()).toEqual([]);
	});
});
