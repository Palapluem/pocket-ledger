import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type APIRequestContext, expect, test } from "@playwright/test";

import { E2E_USERS } from "../fixtures";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const USER = E2E_USERS.receipt;
/** The commit apps/server/tests/e2e-server.ts reports from /api/health. */
const COMMIT = "e2e";

/**
 * Forwards to the E2E server and, while `failReadback` is set, answers the single-transaction
 * read with 500: a failure that happens after the charge was committed by the real server.
 */
async function startFaultProxy(target: string) {
	const state = { failReadback: true };
	const server: Server = createServer(async (req, res) => {
		const url = req.url ?? "/";
		if (
			state.failReadback &&
			req.method === "GET" &&
			/^\/api\/transactions\/[^/?]+/.test(url)
		) {
			res.writeHead(500, { "content-type": "application/json" });
			res.end('{"code":"INTERNAL_ERROR","message":"injected"}');
			return;
		}
		const chunks: Buffer[] = [];
		for await (const chunk of req) chunks.push(chunk as Buffer);
		const headers = new Headers();
		for (const [k, v] of Object.entries(req.headers))
			if (typeof v === "string" && k !== "host") headers.set(k, v);
		if (headers.has("origin")) headers.set("origin", target);
		const upstream = await fetch(`${target}${url}`, {
			method: req.method,
			headers,
			body: chunks.length ? Buffer.concat(chunks) : undefined,
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
		close: () => server.close(),
	};
}

/** Runs the operator script as the operator would, with the password on stdin. */
function runScript(args: string[], liveUrl: string) {
	return new Promise<{ code: number | null; out: string }>((resolve) => {
		const child = spawn("bun", ["scripts/live-check.ts", ...args], {
			cwd: ROOT,
			env: { ...process.env, LIVE_URL: liveUrl, LIVE_EMAIL: USER.email },
		});
		let out = "";
		child.stdout.on("data", (d) => {
			out += d;
		});
		child.stderr.on("data", (d) => {
			out += d;
		});
		child.on("close", (code) => resolve({ code, out }));
		child.stdin.end(`${USER.password}\n`);
	});
}

async function transactionsOf(request: APIRequestContext, baseURL: string) {
	const login = await request.post("/api/session", {
		headers: { origin: baseURL },
		data: { email: USER.email, password: USER.password },
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
