import { beforeEach, describe, expect, test } from "bun:test";

import { cardCharge, financeFixture } from "./finance-helpers";

let f: Awaited<ReturnType<typeof financeFixture>>;
let alice: string;
let bob: string;
let admin: string;

beforeEach(async () => {
	f = await financeFixture();
	[alice, bob, admin] = await Promise.all([
		f.login("userA"),
		f.login("userB"),
		f.login("admin"),
	]);
});

const aliceCharge = async () => {
	const res = await f.send("POST", "/api/transactions", {
		body: cardCharge(f.accounts.userA),
		cookie: alice,
	});
	expect(res.status).toBe(201);
	return ((await res.json()) as { id: string }).id;
};

/** A denial must not carry amounts, names or account identifiers of User A. */
const expectNoLeak = async (res: Response) => {
	const text = await res.text();
	expect(text).not.toContain("1200");
	expect(text).not.toContain("Credit card");
	expect(text).not.toContain(f.accounts.userA["Credit card"]);
};

describe("TEST-21 / AC-21 another User cannot read or use User A's records", () => {
	test("User B cannot read A's transaction; the response is a safe not-found", async () => {
		const id = await aliceCharge();
		const res = await f.send("GET", `/api/transactions/${id}`, { cookie: bob });
		expect(res.status).toBe(404);
		await expectNoLeak(res);
	});

	test("User B's history, accounts and summary contain none of A's records", async () => {
		await aliceCharge();
		const history = await f.send("GET", "/api/transactions", { cookie: bob });
		expect(await history.json()).toEqual([]);
		const accounts = (await (
			await f.send("GET", "/api/accounts", { cookie: bob })
		).json()) as { id: string }[];
		expect(accounts.map((a) => a.id).sort()).toEqual(
			Object.values(f.accounts.userB).sort(),
		);
		const summary = (await (
			await f.send("GET", "/api/summary", { cookie: bob })
		).json()) as Record<string, unknown>;
		expect(summary.expense).toBe("0.00");
	});

	test("User B cannot charge A's card or allocate to A's account; nothing is written", async () => {
		const usesForeignPrimary = await f.send("POST", "/api/transactions", {
			body: cardCharge(f.accounts.userB, {
				primaryAccountId: f.accounts.userA["Credit card"],
			}),
			cookie: bob,
		});
		expect(usesForeignPrimary.status).toBe(404);
		await expectNoLeak(usesForeignPrimary);

		const injectsForeignLine = await f.send("POST", "/api/transactions", {
			body: cardCharge(f.accounts.userB, {
				allocations: [
					{ accountId: f.accounts.userB.Dining, amount: "700.00" },
					{ accountId: f.accounts.userA.Groceries, amount: "500.00" },
				],
			}),
			cookie: bob,
		});
		expect(injectsForeignLine.status).toBe(404);
		expect(await f.counts()).toEqual({ transactions: 0, lines: 0 });
	});
});

describe("TEST-08 / AC-08 the Administrator has no financial access", () => {
	test.each([
		["GET", "/api/accounts"],
		["GET", "/api/transactions"],
		["GET", "/api/summary"],
	])("%s %s is forbidden without financial data", async (method, path) => {
		await aliceCharge();
		const res = await f.send(method, path, { cookie: admin });
		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({
			code: "FORBIDDEN",
			message: "You do not have access to this operation.",
		});
	});

	test("the Administrator cannot read a known transaction or create one", async () => {
		const id = await aliceCharge();
		const read = await f.send("GET", `/api/transactions/${id}`, {
			cookie: admin,
		});
		expect(read.status).toBe(403);
		await expectNoLeak(read);
		const write = await f.send("POST", "/api/transactions", {
			body: cardCharge(f.accounts.userA),
			cookie: admin,
		});
		expect(write.status).toBe(403);
		expect(await f.counts()).toEqual({ transactions: 1, lines: 2 });
	});

	test("anonymous callers are unauthenticated", async () => {
		for (const path of ["/api/accounts", "/api/transactions", "/api/summary"]) {
			const res = await f.send("GET", path);
			expect(res.status).toBe(401);
		}
		const write = await f.send("POST", "/api/transactions", {
			body: cardCharge(f.accounts.userA),
		});
		expect(write.status).toBe(401);
	});
});
