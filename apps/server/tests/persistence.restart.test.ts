import { beforeEach, expect, test } from "bun:test";
import { createDb } from "@pocket-ledger/db";
import { seedStarterAccounts } from "@pocket-ledger/db/seed";
import { createApp } from "../src/app";
import {
	ALLOWED_ORIGIN,
	assertOwnedTestDatabase,
	FIXTURE,
	resetDatabase,
	TEST_JWT,
	testDatabaseUrl,
} from "./helpers";

const receiveSalary = async (baseUrl: string, cookie: string) => {
	const headers = {
		cookie,
		origin: ALLOWED_ORIGIN,
		"content-type": "application/json",
	};
	const accountsResponse = await fetch(`${baseUrl}/api/accounts`, { headers });
	expect(accountsResponse.status).toBe(200);
	const accounts = (await accountsResponse.json()) as {
		id: string;
		name: string;
	}[];
	const bank = accounts.find((account) => account.name === "Bank");
	const salary = accounts.find((account) => account.name === "Salary");
	if (!bank || !salary)
		throw new Error("Seeded account fixture is incomplete.");

	const opening = await fetch(
		`${baseUrl}/api/accounts/${bank.id}/opening-balance`,
		{
			method: "PUT",
			headers,
			body: JSON.stringify({ amount: "10000.00", date: "2026-11-01" }),
		},
	);
	expect(opening.status).toBe(200);

	const saved = await fetch(`${baseUrl}/api/transactions`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			form: "RECEIVE",
			primaryAccountId: bank.id,
			date: "2026-11-02",
			total: "20000.00",
			allocations: [{ accountId: salary.id, amount: "20000.00" }],
		}),
	});
	expect(saved.status).toBe(201);
	const transaction = (await saved.json()) as { id: string };
	return {
		bankId: bank.id,
		salaryId: salary.id,
		transactionId: transaction.id,
	};
};

beforeEach(async () => {
	await resetDatabase();
});

test("TEST-26 / saved account and salary data survive an application server restart", async () => {
	const db = await resetDatabase();
	await seedStarterAccounts(testDatabaseUrl());
	let restartedDb: ReturnType<typeof createDb> | undefined;
	const start = (db: Awaited<ReturnType<typeof resetDatabase>>) => {
		const app = createApp({ db, jwt: TEST_JWT, allowedOrigin: ALLOWED_ORIGIN });
		app.listen({ port: 0, hostname: "127.0.0.1" });
		const port = app.server?.port;
		if (!port) throw new Error("The test application did not bind a port.");
		return { app, baseUrl: `http://127.0.0.1:${port}` };
	};

	let running: ReturnType<typeof start> | undefined = start(db);
	const stop = async () => {
		const current = running;
		running = undefined;
		if (current) await current.app.stop(true);
	};
	try {
		if (!running)
			throw new Error("The first application instance did not start.");
		const login = await fetch(`${running.baseUrl}/api/session`, {
			method: "POST",
			headers: {
				origin: ALLOWED_ORIGIN,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				email: FIXTURE.userA.email,
				password: FIXTURE.userA.password,
			}),
		});
		expect(login.status).toBe(200);
		const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
		if (!cookie) throw new Error("Sign-in did not issue the test cookie.");

		const saved = await receiveSalary(running.baseUrl, cookie);
		await stop();

		// Recreate both the app server and its database pool. The second read cannot use
		// process-local state or a connection from the first app instance.
		restartedDb = createDb(testDatabaseUrl());
		await assertOwnedTestDatabase(restartedDb);
		running = start(restartedDb);
		if (!running) throw new Error("The restarted application did not start.");
		const headers = { cookie, origin: ALLOWED_ORIGIN };
		const detail = await fetch(
			`${running.baseUrl}/api/transactions/${saved.transactionId}`,
			{ headers },
		);
		expect(detail.status).toBe(200);
		expect(await detail.json()).toMatchObject({
			id: saved.transactionId,
			form: "RECEIVE",
			total: "20000.00",
		});

		const accountsResponse = await fetch(`${running.baseUrl}/api/accounts`, {
			headers,
		});
		expect(accountsResponse.status).toBe(200);
		const accounts = (await accountsResponse.json()) as {
			id: string;
			balance: string;
		}[];
		expect(
			accounts.find((account) => account.id === saved.bankId)?.balance,
		).toBe("30000.00");
		expect(
			accounts.find((account) => account.id === saved.salaryId)?.balance,
		).toBe("20000.00");
	} finally {
		await stop();
		if (restartedDb) await restartedDb.$client.close();
	}
});
