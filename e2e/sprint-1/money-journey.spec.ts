import { expect, type Page, test } from "@playwright/test";

import { E2E_USERS } from "../fixtures";

const signIn = async (
	page: Page,
	user: { email: string; password: string },
) => {
	await page.goto("/login");
	await page.getByLabel("Email").fill(user.email);
	await page.getByLabel("Password").fill(user.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/overview$/);
};

/** Fills the payment form; each line is [account option label, amount]. */
const fillPayment = async (
	page: Page,
	primary: string,
	total: string,
	lines: [string, string][],
) => {
	await page
		.getByRole("link", { name: "Make a payment or record a charge" })
		.click();
	await expect(page).toHaveURL(/\/transactions\/new$/);
	await page
		.getByLabel("Pay from or charge to")
		.selectOption({ label: primary });
	await page.getByLabel("Total (THB)").fill(total);
	for (const [i, [account, amount]] of lines.entries()) {
		if (i > 0) await page.getByRole("button", { name: "Add line" }).click();
		await page
			.getByLabel(`Line ${i + 1} account`)
			.selectOption({ label: account });
		await page.getByLabel(`Line ${i + 1} amount`).fill(amount);
	}
};

const CARD = "Credit card (Loan taken / card)";
const BANK = "Bank (Cash / bank)";
const DINING = "Dining (Expense)";
const GROCERIES = "Groceries (Expense)";

test.describe("TEST-17/19/22 / AC-17, AC-19 money journey in the browser", () => {
	test("split card purchase is saved and shown; rule violations are rejected with no effect", async ({
		page,
	}) => {
		await signIn(page, E2E_USERS.payer);
		await expect(page.getByTestId("balance-Credit card")).toHaveText("0.00");
		await expect(page.getByText("No transactions yet.")).toBeVisible();

		// AC-17: card charge 1,200 split dining 700 + groceries 500.
		await fillPayment(page, CARD, "1200.00", [
			[DINING, "700.00"],
			[GROCERIES, "500.00"],
		]);
		await expect(
			page.getByText("Allocated 1,200.00 of 1,200.00"),
		).toBeVisible();
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page).toHaveURL(/\/overview$/);
		await expect(page.getByTestId("balance-Credit card")).toHaveText(
			"1,200.00",
		);
		await expect(page.getByTestId("balance-Dining")).toHaveText("700.00");
		await expect(page.getByTestId("balance-Groceries")).toHaveText("500.00");
		await expect(page.getByTestId("expense")).toHaveText("1,200.00");
		await expect(page.getByTestId("income")).toHaveText("0.00");
		const history = page.getByRole("region", { name: "History" });
		await expect(history.getByText("Dining: 700.00")).toBeVisible();
		await expect(history.getByText("Groceries: 500.00")).toBeVisible();

		// AC-19: 700 + 400 against 1,200 is rejected by the server; nothing changes.
		await page.goto("/overview");
		await fillPayment(page, CARD, "1200.00", [
			[DINING, "700.00"],
			[GROCERIES, "400.00"],
		]);
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByRole("alert")).toHaveText(
			"Allocations must add up exactly to the total.",
		);
		await expect(page).toHaveURL(/\/transactions\/new$/);

		// D-03: repaying the card from an empty bank would overdraw it.
		await page.goto("/overview");
		await fillPayment(page, BANK, "500.00", [[CARD, "500.00"]]);
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByRole("alert")).toHaveText(
			"This would make an account balance negative.",
		);

		// Fresh read after a reload: still exactly one saved transaction and the same values.
		await page.goto("/overview");
		await expect(page.getByTestId("balance-Credit card")).toHaveText(
			"1,200.00",
		);
		await expect(page.getByTestId("balance-Bank")).toHaveText("0.00");
		await expect(history.locator(":scope > ul > li")).toHaveCount(1);
	});
});

test.describe("TEST-28 / AC-28 one submission, no automatic retry", () => {
	test("repeat activations while pending send one request; an uncertain outcome asks the user to check history", async ({
		page,
	}) => {
		await signIn(page, E2E_USERS.retry);
		let posts = 0;
		page.on("request", (r) => {
			if (r.method() === "POST" && r.url().endsWith("/api/transactions"))
				posts += 1;
		});

		// Slow server: activate Save three times while the first request is pending.
		await page.route("**/api/transactions", async (route) => {
			if (route.request().method() !== "POST") return route.continue();
			await new Promise((r) => setTimeout(r, 1500));
			await route.continue();
		});
		await fillPayment(page, CARD, "100.00", [[DINING, "100.00"]]);
		const save = page.getByRole("button", { name: "Save" });
		await save.click();
		await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
		await page.getByRole("button", { name: "Saving…" }).click({ force: true });
		await page.getByLabel("Total (THB)").press("Enter");
		await expect(page).toHaveURL(/\/overview$/);
		expect(posts).toBe(1);
		await expect(page.getByTestId("balance-Credit card")).toHaveText("100.00");

		// Commit the transaction, then drop the response to simulate an ambiguous outcome.
		await page.unroute("**/api/transactions");
		await page.goto("/transactions");
		const previousPaymentCount = await page
			.getByRole("table")
			.locator("tbody tr")
			.count();
		await page.route("**/api/transactions", async (route) => {
			if (route.request().method() !== "POST") return route.continue();
			const committed = await route.fetch();
			expect(committed.status()).toBe(201);
			await route.abort("timedout");
		});
		posts = 0;
		await fillPayment(page, CARD, "50.00", [[DINING, "50.00"]]);
		await page.getByRole("button", { name: "Save" }).click();
		await expect(page.getByRole("alert")).toHaveText(
			"We could not confirm whether this transaction was saved. Check your history before submitting again.",
		);
		await page.waitForTimeout(1000);
		expect(posts).toBe(1);
		// The User may deliberately submit again after checking history.
		await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();
		await page.goto("/transactions");
		const paymentHistory = page.getByRole("table");
		await expect(paymentHistory.locator("tbody tr")).toHaveCount(
			previousPaymentCount + 1,
		);
		await expect(paymentHistory).toContainText("฿50.00");
	});
});

test.describe("TEST-28 / AC-28 receive form submission safety", () => {
	test("repeat activations send one receipt; uncertain outcomes do not retry", async ({
		page,
	}) => {
		await signIn(page, E2E_USERS.retry);
		await page.getByRole("link", { name: "Receive money" }).click();
		let posts = 0;
		page.on("request", (request) => {
			if (
				request.method() === "POST" &&
				request.url().endsWith("/api/transactions")
			)
				posts += 1;
		});

		await page.route("**/api/transactions", async (route) => {
			if (route.request().method() !== "POST") return route.continue();
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await route.continue();
		});
		await page.getByLabel("Total received (THB)").fill("100.00");
		await page.getByRole("button", { name: "Save receipt" }).click();
		await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
		await page.getByRole("button", { name: "Saving…" }).click({ force: true });
		await page.getByLabel("Allocation 1 amount (THB)").press("Enter");
		await expect(page.getByRole("status")).toHaveText(
			"Saved transaction and verified it with a fresh history read.",
		);
		expect(posts).toBe(1);

		await page.unroute("**/api/transactions");
		await page.goto("/transactions");
		const previousReceiptCount = await page
			.getByRole("table")
			.locator("tbody tr")
			.count();
		await page.getByRole("link", { name: "Receive money" }).click();
		await page.route("**/api/transactions", async (route) => {
			if (route.request().method() !== "POST") return route.continue();
			const committed = await route.fetch();
			expect(committed.status()).toBe(201);
			await route.abort("timedout");
		});
		posts = 0;
		await page.getByLabel("Total received (THB)").fill("50.00");
		await page.getByRole("button", { name: "Save receipt" }).click();
		await expect(page.getByRole("alert")).toHaveText(
			"We could not confirm whether the request was saved. Check transaction history before submitting again; automatic retry is disabled.",
		);
		await page.waitForTimeout(750);
		expect(posts).toBe(1);
		await expect(
			page.getByRole("button", { name: "Save receipt" }),
		).toBeEnabled();
		await page.goto("/transactions");
		const receiptHistory = page.getByRole("table");
		await expect(receiptHistory.locator("tbody tr")).toHaveCount(
			previousReceiptCount + 1,
		);
		await expect(receiptHistory).toContainText("฿50.00");
	});
});

test.describe("TEST-10/13/14/23 / opening balance and salary receive journey", () => {
	test("persists the opening balance, rejects a mismatched receipt, then retrieves salary history", async ({
		page,
	}) => {
		await signIn(page, E2E_USERS.user);
		await page.getByRole("link", { name: "Accounts" }).click();
		await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
		await page.getByLabel("Opening balance amount (THB)").fill("10000.00");
		await page.getByLabel("Opening balance date").fill("2026-11-01");
		const confirmedAccountRead = page.waitForResponse(
			(response) =>
				response.request().method() === "GET" &&
				/\/api\/accounts\/[^/]+$/.test(new URL(response.url()).pathname),
		);
		await page.getByRole("button", { name: "Save opening balance" }).click();
		const accountRead = await confirmedAccountRead;
		expect(accountRead.status()).toBe(200);
		expect(await accountRead.json()).toMatchObject({
			openingAmount: "10000.00",
			openingDate: "2026-11-01",
			balance: "10000.00",
		});
		await expect(page.getByRole("status")).toHaveText(
			"Opening balance saved and retrieved from the account record.",
		);
		await expect(page.getByText("฿10000.00").first()).toBeVisible();

		await page.getByRole("link", { name: "Receive money" }).click();
		await page.getByLabel("Date received").fill("2026-11-02");
		await page.getByLabel("Total received (THB)").fill("20000.00");
		const allocation = page.getByLabel("Allocation 1 amount (THB)");
		await expect(allocation).toHaveValue("20000.00");
		await allocation.fill("19999.99");
		await page.getByRole("button", { name: "Save receipt" }).click();
		await expect(page.getByRole("alert")).toHaveText(
			"Allocations must add up exactly to the total.",
		);
		const rejectedHistory = await page.request.get("/api/transactions");
		expect(rejectedHistory.status()).toBe(200);
		expect(await rejectedHistory.json()).toEqual([]);

		await allocation.fill("20000.00");
		await page.getByRole("button", { name: "Save receipt" }).click();
		await expect(page.getByRole("status")).toHaveText(
			"Saved transaction and verified it with a fresh history read.",
		);
		await expect(
			page.getByText("Saved receive of ฿20000.00 on 2026-11-02."),
		).toBeVisible();
		await expect(page.getByLabel("Cash account")).toContainText(
			"Bank · ฿30000.00",
		);

		await page
			.getByRole("link", { name: "Transaction history", exact: true })
			.click();
		await page
			.getByRole("button", { name: "View 2026-11-02 transaction" })
			.click();
		await expect(
			page.getByRole("heading", { name: "Transaction detail" }),
		).toBeVisible();
		await expect(page.getByText("Salary · ฿20000.00")).toBeVisible();
	});
});
