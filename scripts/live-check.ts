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
let total = 0;
let failures = 0;
let stopped = false;
/** Every assertion goes through here, so the PASS/FAIL lines and the final count agree. */
const check = (name: string, ok: boolean) => {
	total += 1;
	if (!ok) failures += 1;
	note(`${ok ? "PASS" : "FAIL"} ${name}`);
	return ok;
};
/** A browser assertion counted as a check (Playwright waits up to its default timeout). */
const checkUi = async (name: string, assertion: () => Promise<void>) => {
	try {
		await assertion();
		return check(name, true);
	} catch {
		return check(name, false);
	}
};

type Summary = {
	income: string;
	expense: string;
	accounts: { id: string; name: string; balance: string }[];
};
type Detail = {
	id: string;
	form: string;
	primaryAccountId: string;
	date: string;
	total: string;
	memo: string | null;
	allocations: { accountId: string; amount: string }[];
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
const accountId = (s: Summary, name: string) =>
	s.accounts.find((a) => a.name === name)?.id;
/** Calendar date in Asia/Bangkok (D-04) of an ISO instant. */
const bangkokDate = (iso: string) => {
	const instant = new Date(iso);
	return Number.isNaN(instant.getTime())
		? `invalid instant ${iso}`
		: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
				instant,
			);
};
const MEMO_PREFIX = "Lab 5 C-04 synthetic charge ";

/**
 * Checks a retrieved transaction field by field against independently expected values:
 * the identifier and memo the script created, a PAYMENT of 1,200.00 charged to the
 * Credit card on the Bangkok date of creation, split Dining 700.00 / Groceries 500.00.
 */
const checkRecord = (
	status: number,
	detail: Detail,
	expected: { id: string; memo: string; summary: Summary },
) => {
	const { id, memo, summary } = expected;
	check("retrieved record status 200", status === 200);
	check("record id matches", detail.id === id);
	check("record form PAYMENT", detail.form === "PAYMENT");
	check(
		"record charged to Credit card",
		detail.primaryAccountId === accountId(summary, "Credit card"),
	);
	check("record total 1200.00", detail.total === "1200.00");
	check("record memo matches", detail.memo === memo);
	check(
		"record date is the Bangkok date of creation",
		detail.date === bangkokDate(memo.slice(MEMO_PREFIX.length)),
	);
	const lines = [...(detail.allocations ?? [])]
		.map((l) => `${l.accountId}=${l.amount}`)
		.sort();
	const want = [
		`${accountId(summary, "Dining")}=700.00`,
		`${accountId(summary, "Groceries")}=500.00`,
	].sort();
	check(
		"record allocations exactly Dining 700.00 + Groceries 500.00",
		JSON.stringify(lines) === JSON.stringify(want),
	);
};

const fillCharge = async (memo: string | undefined, groceries: string) => {
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
	await page.getByLabel("Line 2 amount").fill(groceries);
	if (memo) await page.getByLabel("Memo (optional)").fill(memo);
};
const submit = async () => {
	const [response] = await Promise.all([
		page.waitForResponse(
			(r) =>
				r.request().method() === "POST" &&
				r.url().endsWith("/api/transactions"),
		),
		page.getByRole("button", { name: "Save" }).click(),
	]);
	return response;
};
const getJson = async <T>(path: string) => {
	const res = await page.request.get(`${BASE}${path}`);
	return { status: res.status(), body: (await res.json()) as T };
};

try {
	const health = (
		await getJson<{ database?: string; commit?: string }>("/api/health")
	).body;
	note(`health: ${JSON.stringify(health)}`);
	check("health reports database ok", health.database === "ok");

	await page.goto(`${BASE}/login`);
	await page.getByLabel("Email").fill(email);
	// Captured before the password is typed, so the image does not reveal its length.
	await shot(page, "01-login");
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign in" }).click();
	if (
		!(await checkUi(
			"sign-in reaches the overview",
			async () => await expect(page.getByTestId("expense")).toBeVisible(),
		))
	)
		throw new Error("sign-in failed; stopping");
	await shot(page, "02-overview-signed-in");

	if (mode === "record") {
		if (existsSync(recordFile))
			throw new Error(
				`${recordFile} already exists; it is the C-05 baseline and is not overwritten`,
			);
		const before = (await getJson<Summary>("/api/summary")).body;
		note(`summary before: ${JSON.stringify(before)}`);

		const memo = `${MEMO_PREFIX}${stamp()}`;
		await fillCharge(memo, "500.00");
		await shot(page, "03-charge-form");
		const created = await submit();
		if (!check("save returns 201", created.status() === 201))
			throw new Error("save failed; stopping");
		const { id } = (await created.json()) as { id: string };
		note(`saved transaction ${id}`);
		await checkUi(
			"saved charge shown in the overview history",
			async () => await expect(page.getByText(memo)).toBeVisible(),
		);
		await shot(page, "04-overview-after-save");

		const after = (await getJson<Summary>("/api/summary")).body;
		const read = await getJson<Detail>(`/api/transactions/${id}`);
		note(`saved retrieval: ${read.status} ${JSON.stringify(read.body)}`);
		note(`summary after: ${JSON.stringify(after)}`);
		checkRecord(read.status, read.body, { id, memo, summary: after });
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
		await fillCharge(undefined, "400.00");
		const rejected = await submit();
		note(
			`rule rejection: POST /api/transactions -> ${rejected.status()} ${JSON.stringify(await rejected.json())}`,
		);
		check("rule rejection is 422", rejected.status() === 422);
		await checkUi(
			"rejection message shown",
			async () =>
				await expect(page.getByRole("alert")).toHaveText(
					"Allocations must add up exactly to the total.",
				),
		);
		await shot(page, "05-rule-rejection");
		const unchanged = (await getJson<Summary>("/api/summary")).body;
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
				`${JSON.stringify({ recordedAt: stamp(), health, id, memo, detail: read.body, summary: after }, null, 2)}\n`,
			);
			note(`record stored in ${recordFile}`);
		}
	} else {
		const saved = JSON.parse(readFileSync(recordFile, "utf8")) as {
			id: string;
			memo: string;
			detail: Detail;
			summary: Summary;
		};
		const summary = (await getJson<Summary>("/api/summary")).body;
		const read = await getJson<Detail>(`/api/transactions/${saved.id}`);
		note(
			`GET /api/transactions/${saved.id} -> ${read.status} ${JSON.stringify(read.body)}`,
		);
		note(`summary: ${JSON.stringify(summary)}`);
		checkRecord(read.status, read.body, {
			id: saved.id,
			memo: saved.memo,
			summary,
		});
		check(
			"record identical to the baseline",
			JSON.stringify(read.body) === JSON.stringify(saved.detail),
		);
		check(
			"balances and income/expense identical to the baseline",
			JSON.stringify(summary) === JSON.stringify(saved.summary),
		);
		await checkUi(
			"same record shown in the overview history",
			async () => await expect(page.getByText(saved.memo)).toBeVisible(),
		);
		await shot(page, "03-overview-same-record");
	}
} catch (error) {
	await shot(page, "error").catch(() => {});
	note(`STOPPED: ${error instanceof Error ? error.message : String(error)}`);
	stopped = true;
} finally {
	const passed = total - failures;
	const ok = failures === 0 && !stopped;
	note(
		ok
			? `RESULT: PASS (${passed}/${total} checks)`
			: `RESULT: FAIL (${passed}/${total} checks passed${stopped ? "; run stopped early" : ""})`,
	);
	process.exitCode = ok ? 0 : 1;
	writeFileSync(join(outDir, `${label}-log.txt`), `${log.join("\n")}\n`);
	await browser.close();
}
