import { afterEach, expect, test } from "bun:test";
import { join } from "node:path";
import type { Subprocess } from "bun";

import {
	cardCharge,
	financeFixture,
	repayment,
	salary,
} from "./finance-helpers";
import { ALLOWED_ORIGIN, FIXTURE, TEST_JWT, testDatabaseUrl } from "./helpers";

const ENTRY = join(import.meta.dir, "../src/index.ts");

/** A free loopback port, released before the server process binds it. */
const freePort = () => {
	const probe = Bun.serve({
		port: 0,
		hostname: "127.0.0.1",
		fetch: () => new Response(),
	});
	const port = probe.port;
	if (!port) throw new Error("no free port");
	probe.stop(true);
	return port;
};

let running: Subprocess | undefined;

/** Starts the production entry point (src/index.ts) as its own OS process. */
async function startServer(port: number) {
	const proc = Bun.spawn(["bun", ENTRY], {
		env: {
			PATH: process.env.PATH ?? "",
			DATABASE_URL: testDatabaseUrl(),
			JWT_SECRET: TEST_JWT.secret,
			JWT_ISSUER: TEST_JWT.issuer,
			JWT_AUDIENCE: TEST_JWT.audience,
			CORS_ORIGIN: ALLOWED_ORIGIN,
			PORT: String(port),
		},
		stdout: "ignore",
		stderr: "ignore",
	});
	running = proc;
	const base = `http://127.0.0.1:${port}`;
	for (let i = 0; i < 100; i++) {
		if (proc.exitCode !== null) throw new Error("server process exited early");
		try {
			if ((await fetch(`${base}/api/health`)).ok) return { proc, base };
		} catch {
			// not listening yet
		}
		await Bun.sleep(100);
	}
	throw new Error("server did not become healthy");
}

async function stopServer(proc: Subprocess) {
	proc.kill("SIGTERM");
	await proc.exited;
	running = undefined;
}

afterEach(async () => {
	if (running) await stopServer(running);
});

test("TEST-26 / AC-26 saved identifiers and financial values survive an application process restart", async () => {
	// Fixture accounts (opening dates 2026-11-01) and the D-07 opening bank balance of 10,000.00.
	const { accounts, setOpening } = await financeFixture();
	const a = accounts.userA;
	await setOpening(a.Bank, 1_000_000n);

	const port = freePort();
	const first = await startServer(port);
	const call = async (
		base: string,
		method: string,
		path: string,
		cookie?: string,
		body?: unknown,
	) =>
		fetch(`${base}${path}`, {
			method,
			headers: {
				origin: ALLOWED_ORIGIN,
				...(cookie ? { cookie } : {}),
				...(body === undefined ? {} : { "content-type": "application/json" }),
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		});

	const login = await call(first.base, "POST", "/api/session", undefined, {
		email: FIXTURE.userA.email,
		password: FIXTURE.userA.password,
	});
	expect(login.status).toBe(200);
	const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";

	const ids: string[] = [];
	for (const payload of [salary(a), cardCharge(a), repayment(a)]) {
		const res = await call(
			first.base,
			"POST",
			"/api/transactions",
			cookie,
			payload,
		);
		expect(res.status).toBe(201);
		ids.push(((await res.json()) as { id: string }).id);
	}
	const before: { history: unknown; summary: unknown } = {
		history: await (
			await call(first.base, "GET", "/api/transactions", cookie)
		).json(),
		summary: await (
			await call(first.base, "GET", "/api/summary", cookie)
		).json(),
	};

	// Actual restart: the first process exits, then a new process starts on the same database.
	await stopServer(first.proc);
	expect(first.proc.exitCode !== null || first.proc.signalCode !== null).toBe(
		true,
	);
	const second = await startServer(port);
	expect(second.proc.pid).not.toBe(first.proc.pid);

	const history = (await (
		await call(second.base, "GET", "/api/transactions", cookie)
	).json()) as { id: string }[];
	const summary = (await (
		await call(second.base, "GET", "/api/summary", cookie)
	).json()) as {
		income: string;
		expense: string;
		accounts: { name: string; balance: string }[];
	};

	// Same identifiers and the same full records as before the restart.
	expect(history.map((t) => t.id).sort()).toEqual([...ids].sort());
	expect(history as unknown).toEqual(before.history);
	expect(summary as unknown).toEqual(before.summary);
	for (const id of ids) {
		const detail = await call(
			second.base,
			"GET",
			`/api/transactions/${id}`,
			cookie,
		);
		expect(detail.status).toBe(200);
	}

	// Independent AC-22 values: bank 29,500, card 700, Income 20,000, Expense 1,200.
	const balance = Object.fromEntries(
		summary.accounts.map((x) => [x.name, x.balance]),
	);
	expect(balance).toMatchObject({
		Bank: "29500.00",
		"Credit card": "700.00",
		Salary: "20000.00",
		Dining: "700.00",
		Groceries: "500.00",
	});
	expect(summary.income).toBe("20000.00");
	expect(summary.expense).toBe("1200.00");
});
