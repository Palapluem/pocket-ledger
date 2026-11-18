/**
 * Lab 5 live checks against the deployed service (C-04 and C-05).
 *
 *   bun scripts/live-check.ts record <outDir>          C-04: sign in, save a card charge, show a rule rejection
 *                                                      and an unauthenticated rejection; stores the record for C-05.
 *   bun scripts/live-check.ts verify <outDir> <label>  C-05: sign in again and compare the same record and summary.
 *
 * Uses a synthetic seeded User. The email comes from LIVE_EMAIL or a prompt; the password
 * comes from a hidden prompt and is never written to disk or output.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, expect, type Page } from "@playwright/test";

const BASE =
	process.env.LIVE_URL ??
	"https://pocket-ledger-468473091761.asia-southeast3.run.app";
const [mode, outDir, label = "check"] = process.argv.slice(2);
if ((mode !== "record" && mode !== "verify") || !outDir) {
	console.error(
		"usage: bun scripts/live-check.ts record <outDir> | verify <outDir> <label>",
	);
	process.exit(2);
}
mkdirSync(outDir, { recursive: true });
const recordFile = join(outDir, "c05-record.json");

function ask(question: string, hidden: boolean): Promise<string> {
	process.stdout.write(question);
	const stdin = process.stdin;
	const raw = hidden && stdin.isTTY;
	if (raw) stdin.setRawMode(true);
	return new Promise((resolve) => {
		let buf = "";
		const onData = (data: Buffer) => {
			for (const ch of data.toString("utf8")) {
				if (ch === "\u0003") process.exit(130);
				if (ch === "\r" || ch === "\n") {
					stdin.off("data", onData);
					if (raw) stdin.setRawMode(false);
					stdin.pause();
					if (raw) process.stdout.write("\n");
					resolve(buf.trim());
					return;
				}
				if (ch === "\u007f") buf = buf.slice(0, -1);
				else buf += ch;
			}
		};
		stdin.on("data", onData);
		stdin.resume();
	});
}

const email =
	process.env.LIVE_EMAIL ?? (await ask("Synthetic user email: ", false));
const password = await ask("Password (hidden): ", true);

const stamp = () => new Date().toISOString();
const shot = (page: Page, name: string) =>
	page.screenshot({
		path: join(outDir, `${label}-${name}.png`),
		fullPage: true,
	});

const browser = await chromium.launch();
const page = await (
	await browser.newContext({ viewport: { width: 1100, height: 900 } })
).newPage();
const log: string[] = [];
const note = (line: string) => {
	log.push(`${stamp()} ${line}`);
	console.log(line);
};
let failures = 0;
const check = (name: string, ok: boolean) => {
	if (!ok) failures += 1;
	note(`${ok ? "PASS" : "FAIL"} ${name}`);
};

type Summary = {
	income: string;
	expense: string;
	accounts: { name: string; balance: string }[];
};
/** "1200.00" -> 120000n satang, without floating point. */
const satang = (value: string | undefined) => {
	const match = /^(-?)(\d+)\.(\d{2})$/.exec(value ?? "");
	if (!match) throw new Error(`unexpected amount ${value}`);
	const minor = BigInt(match[2] ?? "0") * 100n + BigInt(match[3] ?? "0");
	return match[1] ? -minor : minor;
};
const amountOf = (s: Summary, key: string) =>
	key === "income" || key === "expense"
		? s[key]
		: s.accounts.find((a) => a.name === key)?.balance;
const delta = (before: Summary, after: Summary, key: string) =>
	satang(amountOf(after, key)) - satang(amountOf(before, key));

try {
	const health = await (await page.request.get(`${BASE}/api/health`)).json();
	note(`health: ${JSON.stringify(health)}`);
	check("health reports database ok", health?.database === "ok");

	await page.goto(`${BASE}/login`);
	await page.getByLabel("Email").fill(email);
	// Captured before the password is typed, so the image does not reveal its length.
	await shot(page, "01-login");
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/overview$/);
	await expect(page.getByTestId("expense")).toBeVisible();
	await shot(page, "02-overview-signed-in");
	note("signed in");

	if (mode === "record") {
		if (existsSync(recordFile))
			throw new Error(
				`${recordFile} already exists; it is the C-05 baseline and is not overwritten`,
			);
		const before = (await (
			await page.request.get(`${BASE}/api/summary`)
		).json()) as Summary;
		note(`summary before: ${JSON.stringify(before)}`);

		const memo = `Lab 5 C-04 synthetic charge ${stamp()}`;
		await page
			.getByRole("link", { name: "Make a payment or record a charge" })
			.click();
		await page
			.getByLabel("Pay from or charge to")
			.selectOption({ label: "Credit card (Loan taken / card)" });
		await page.getByLabel("Total (THB)").fill("1200.00");
		await page
			.getByLabel("Line 1 account")
			.selectOption({ label: "Dining (Expense)" });
		await page.getByLabel("Line 1 amount").fill("700.00");
		await page.getByRole("button", { name: "Add line" }).click();
		await page
			.getByLabel("Line 2 account")
			.selectOption({ label: "Groceries (Expense)" });
		await page.getByLabel("Line 2 amount").fill("500.00");
		await page.getByLabel("Memo (optional)").fill(memo);
		await shot(page, "03-charge-form");
		const [created] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === "POST" &&
					r.url().endsWith("/api/transactions"),
			),
			page.getByRole("button", { name: "Save" }).click(),
		]);
		if (created.status() !== 201)
			throw new Error(`save returned ${created.status()}`);
		const { id } = (await created.json()) as { id: string };
		await expect(page).toHaveURL(/\/overview$/);
		await expect(page.getByText(memo)).toBeVisible();
		await shot(page, "04-overview-after-save");
		note(`saved transaction ${id} (201)`);

		const detail = await (
			await page.request.get(`${BASE}/api/transactions/${id}`)
		).json();
		const after = (await (
			await page.request.get(`${BASE}/api/summary`)
		).json()) as Summary;
		note(`saved retrieval: ${JSON.stringify(detail)}`);
		note(`summary after: ${JSON.stringify(after)}`);
		// Independent expected effect of the 1,200 card charge split 700 / 500.
		check("expense +1200.00", delta(before, after, "expense") === 120_000n);
		check("income unchanged", delta(before, after, "income") === 0n);
		check(
			"Credit card +1200.00",
			delta(before, after, "Credit card") === 120_000n,
		);
		check("Dining +700.00", delta(before, after, "Dining") === 70_000n);
		check("Groceries +500.00", delta(before, after, "Groceries") === 50_000n);
		check("Bank unchanged", delta(before, after, "Bank") === 0n);

		// Rule rejection: allocations 700 + 400 do not equal the 1,200 total.
		await page
			.getByRole("link", { name: "Make a payment or record a charge" })
			.click();
		await page
			.getByLabel("Pay from or charge to")
			.selectOption({ label: "Credit card (Loan taken / card)" });
		await page.getByLabel("Total (THB)").fill("1200.00");
		await page
			.getByLabel("Line 1 account")
			.selectOption({ label: "Dining (Expense)" });
		await page.getByLabel("Line 1 amount").fill("700.00");
		await page.getByRole("button", { name: "Add line" }).click();
		await page
			.getByLabel("Line 2 account")
			.selectOption({ label: "Groceries (Expense)" });
		await page.getByLabel("Line 2 amount").fill("400.00");
		const [rejected] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === "POST" &&
					r.url().endsWith("/api/transactions"),
			),
			page.getByRole("button", { name: "Save" }).click(),
		]);
		await expect(page.getByRole("alert")).toHaveText(
			"Allocations must add up exactly to the total.",
		);
		await shot(page, "05-rule-rejection");
		const unchanged = await (
			await page.request.get(`${BASE}/api/summary`)
		).json();
		note(
			`rule rejection: POST /api/transactions -> ${rejected.status()} ${JSON.stringify(await rejected.json())}`,
		);
		check("rule rejection is 422", rejected.status() === 422);
		check(
			"summary unchanged after rejection",
			JSON.stringify(unchanged) === JSON.stringify(after),
		);

		// Access restriction: no session cookie.
		const anon = await fetch(`${BASE}/api/summary`);
		note(
			`unauthenticated GET /api/summary -> ${anon.status} ${await anon.text()}`,
		);
		check("unauthenticated request is 401", anon.status === 401);

		// Only a fully passing run becomes the C-05 baseline.
		if (failures === 0) {
			writeFileSync(
				recordFile,
				`${JSON.stringify({ recordedAt: stamp(), health, id, memo, detail, summary: after }, null, 2)}\n`,
			);
			note(`record stored in ${recordFile}`);
		}
	} else {
		const saved = JSON.parse(readFileSync(recordFile, "utf8")) as {
			id: string;
			memo: string;
			detail: unknown;
			summary: unknown;
		};
		const res = await page.request.get(`${BASE}/api/transactions/${saved.id}`);
		const detail = await res.json();
		const summary = await (
			await page.request.get(`${BASE}/api/summary`)
		).json();
		note(
			`GET /api/transactions/${saved.id} -> ${res.status()} ${JSON.stringify(detail)}`,
		);
		note(`summary: ${JSON.stringify(summary)}`);
		check("record retrieved (200)", res.status() === 200);
		check(
			"same identifier and record",
			JSON.stringify(detail) === JSON.stringify(saved.detail),
		);
		check(
			"same balances and income/expense",
			JSON.stringify(summary) === JSON.stringify(saved.summary),
		);
		await expect(page.getByText(saved.memo)).toBeVisible();
		await shot(page, "03-overview-same-record");
	}
} catch (error) {
	failures += 1;
	await shot(page, "error").catch(() => {});
	note(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
} finally {
	note(failures === 0 ? "RESULT: PASS" : `RESULT: FAIL (${failures})`);
	process.exitCode = failures === 0 ? 0 : 1;
	writeFileSync(join(outDir, `${label}-log.txt`), `${log.join("\n")}\n`);
	await browser.close();
}
