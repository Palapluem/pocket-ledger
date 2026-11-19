import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type APIRequestContext, expect, test } from "@playwright/test";

import { E2E_USERS } from "../fixtures";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
type User = { email: string; password: string };
const USER = E2E_USERS.receipt;
/** The commit apps/server/tests/e2e-server.ts reports from /api/health. */
const COMMIT = "e2e";

const forwardHeaders = (raw: IncomingHttpHeaders, target: string) => {
	const headers = new Headers();
	for (const [k, v] of Object.entries(raw))
		if (typeof v === "string" && k !== "host") headers.set(k, v);
	if (headers.has("origin")) headers.set("origin", target);
	return headers;
};

/**
 * Forwards to the E2E server, with two injectable faults:
 * - `failReadback`: the single-transaction read answers 500, a failure after the charge committed;
 * - `holdPost`: the transaction POST is held back from the server and the client connection is
 *   dropped, so the client gets no response; `releaseHeldPost()` later lets the server commit it.
 */
async function startFaultProxy(target: string) {
	const state = { failReadback: false, holdPost: false };
	let held: { url: string; headers: Headers; body: Buffer } | undefined;
	const server: Server = createServer(async (req, res) => {
		const url = req.url ?? "/";
		const chunks: Buffer[] = [];
		for await (const chunk of req) chunks.push(chunk as Buffer);
		const body = chunks.length ? Buffer.concat(chunks) : undefined;
		const headers = forwardHeaders(req.headers, target);
		if (
			state.failReadback &&
			req.method === "GET" &&
			/^\/api\/transactions\/[^/?]+/.test(url)
		) {
			res.writeHead(500, { "content-type": "application/json" });
			res.end('{"code":"INTERNAL_ERROR","message":"injected"}');
			return;
		}
		if (
			state.holdPost &&
			req.method === "POST" &&
			url === "/api/transactions" &&
			body
		) {
			held = { url, headers, body };
			setTimeout(() => req.socket.destroy(), 200);
			return;
		}
		const upstream = await fetch(`${target}${url}`, {
			method: req.method,
			headers,
			body,
			redirect: "manual",
		});
		const out: Record<string, string | string[]> = {};
		upstream.headers.forEach((v, k) => {
			if (
				!["content-encoding", "content-length", "transfer-encoding"].includes(k)
			)
				out[k] = v;
		});
		const cookies = upstream.headers.getSetCookie();
		if (cookies.length) out["set-cookie"] = cookies;
		res.writeHead(upstream.status, out);
		res.end(Buffer.from(await upstream.arrayBuffer()));
	});
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
	const { port } = server.address() as AddressInfo;
	return {
		url: `http://127.0.0.1:${port}`,
		state,
		/** The late commit: the held POST finally reaches the server. Returns its status. */
		releaseHeldPost: async () => {
			if (!held) throw new Error("no POST was held");
			const late = await fetch(`${target}${held.url}`, {
				method: "POST",
				headers: held.headers,
				body: held.body,
			});
			held = undefined;
			return late.status;
		},
		close: () => server.close(),
	};
}

/** Runs the operator script as the operator would, with the password on stdin. */
function runScript(args: string[], liveUrl: string, user: User = USER) {
	return new Promise<{ code: number | null; out: string }>((resolve) => {
		const child = spawn("bun", ["scripts/live-check.ts", ...args], {
			cwd: ROOT,
			env: { ...process.env, LIVE_URL: liveUrl, LIVE_EMAIL: user.email },
		});
		let out = "";
		child.stdout.on("data", (d) => {
			out += d;
		});
		child.stderr.on("data", (d) => {
			out += d;
		});
		child.on("close", (code) => resolve({ code, out }));
		child.stdin.end(`${user.password}\n`);
	});
}

async function transactionsOf(
	request: APIRequestContext,
	baseURL: string,
	user: User = USER,
) {
	const login = await request.post("/api/session", {
		headers: { origin: baseURL },
		data: { email: user.email, password: user.password },
	});
	expect(login.status()).toBe(200);
	const list = await request.get("/api/transactions");
	expect(list.status()).toBe(200);
	return (await list.json()) as { id: string; memo: string | null }[];
}

test("Lab 5 live-check: a failure after the charge is committed keeps a receipt, and retries never create a second charge", async ({
	request,
	baseURL,
}, testInfo) => {
	test.setTimeout(180_000);
	const base = baseURL ?? "";
	const dir = testInfo.outputPath("live-check");
	const receiptFile = join(dir, "c05-record.json");
	const receipt = () => JSON.parse(readFileSync(receiptFile, "utf8"));
	expect(await transactionsOf(request, base)).toEqual([]);

	// 1. `record` commits the charge, then the read-back fails (injected 500).
	const proxy = await startFaultProxy(base);
	proxy.state.failReadback = true;
	let run: { code: number | null; out: string };
	try {
		run = await runScript(["record", dir, "c04"], proxy.url);
	} finally {
		proxy.close();
	}
	expect(run.code).toBe(1);
	expect(run.out).toContain("FAIL retrieved record status 200");
	const kept = receipt();
	expect(kept.status).toBe("incomplete");
	const committed = await transactionsOf(request, base);
	expect(committed).toHaveLength(1);
	expect(committed[0]?.id).toBe(kept.id);
	expect(committed[0]?.memo).toBe(kept.memo);

	// 2. A retried `record` refuses to create another charge.
	run = await runScript(["record", dir, "retry"], base);
	expect(run.code).toBe(1);
	expect(run.out).toContain("No new transaction was created");
	expect(await transactionsOf(request, base)).toHaveLength(1);

	// 3. `verify` refuses an incomplete receipt.
	run = await runScript(["verify", dir, "early-verify", COMMIT], base);
	expect(run.code).toBe(1);
	expect(run.out).toContain("not a complete baseline");

	// 4. `reconcile` validates the existing charge and completes the receipt without a new POST.
	run = await runScript(["reconcile", dir, "reconcile"], base);
	expect(run.out).toContain("RESULT: PASS");
	expect(run.code).toBe(0);
	expect(receipt()).toMatchObject({
		status: "complete",
		id: kept.id,
		reconciled: true,
	});

	// 5. verify names the commit it expects: an older revision fails, the running one passes.
	run = await runScript(["verify", dir, "prior", "bbf7c4a-prior"], base);
	expect(run.code).toBe(1);
	expect(run.out).toContain(
		"FAIL running commit is the expected bbf7c4a-prior",
	);
	run = await runScript(["verify", dir, "verify"], base);
	expect(run.code).toBe(2);
	run = await runScript(["verify", dir, "verify", COMMIT], base);
	expect(run.out).toContain("RESULT: PASS (14/14 checks)");
	expect(run.code).toBe(0);
	// 6. There is still exactly one charge, and no output exposed the host path.
	expect(run.out).not.toContain(dir);
	const after = await transactionsOf(request, base);
	expect(after.map((t) => t.id)).toEqual([kept.id]);
});

test("Lab 5 live-check: a POST whose response is lost stays pending; reconcile never authorises a second charge before the late commit is visible", async ({
	request,
	baseURL,
}, testInfo) => {
	test.setTimeout(180_000);
	const user = E2E_USERS.lostResponse;
	const base = baseURL ?? "";
	const dir = testInfo.outputPath("live-check-lost");
	const receiptFile = join(dir, "c05-record.json");
	const receipt = () => JSON.parse(readFileSync(receiptFile, "utf8"));
	expect(await transactionsOf(request, base, user)).toEqual([]);

	const proxy = await startFaultProxy(base);
	try {
		// 1. The POST is held back from the server and the client connection drops: no response.
		proxy.state.holdPost = true;
		let run = await runScript(["record", dir, "c04"], proxy.url, user);
		expect(run.code).toBe(1);
		expect(run.out).toContain("got no response");
		const pending = receipt();
		expect(pending.status).toBe("pending");
		expect(pending.id).toBeUndefined();
		expect(await transactionsOf(request, base, user)).toEqual([]);

		// 2. Reconcile while the request may still commit: nothing visible, but the receipt is kept.
		run = await runScript(["reconcile", dir, "early-reconcile"], base, user);
		expect(run.code).toBe(1);
		expect(run.out).toContain("FAIL pending POST outcome resolved");
		expect(receipt()).toEqual(pending);

		// 3. A retried record is still refused, so no second charge can be sent.
		run = await runScript(["record", dir, "retry"], base, user);
		expect(run.code).toBe(1);
		expect(run.out).toContain("No new transaction was created");
		expect(await transactionsOf(request, base, user)).toEqual([]);

		// 4. The held request commits late.
		expect(await proxy.releaseHeldPost()).toBe(201);
		const late = await transactionsOf(request, base, user);
		expect(late).toHaveLength(1);
		expect(late[0]?.memo).toBe(pending.memo);

		// 5. Reconcile now finds exactly that charge and completes the receipt.
		run = await runScript(["reconcile", dir, "reconcile"], base, user);
		expect(run.out).toContain("RESULT: PASS");
		expect(run.code).toBe(0);
		expect(receipt()).toMatchObject({
			status: "complete",
			id: late[0]?.id,
			reconciled: true,
		});
		expect(
			(await transactionsOf(request, base, user)).map((t) => t.id),
		).toEqual([late[0]?.id]);
	} finally {
		proxy.close();
	}
});
