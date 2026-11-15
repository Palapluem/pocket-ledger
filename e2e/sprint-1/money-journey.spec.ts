import { expect, test } from "@playwright/test";

import { E2E_USERS } from "../fixtures";

const signIn = async (
	page: import("@playwright/test").Page,
	user: { email: string; password: string },
) => {
	await page.goto("/login");
	await page.getByLabel("Email").fill(user.email);
	await page.getByLabel("Password").fill(user.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/overview$/);
};

test.describe("TEST-10/13/14/23 / financial slice in the browser", () => {
	test("TEST-25 / labelled keyboard flow and responsive financial screens", async ({
		page,
	}) => {
		const selectAllShortcut =
			process.platform === "darwin" ? "Meta+A" : "Control+A";
		await signIn(page, E2E_USERS.user);
		let releaseAccounts!: () => void;
		const accountsGate = new Promise<void>((resolve) => {
			releaseAccounts = resolve;
		});
		await page.route("**/api/accounts", async (route) => {
			if (route.request().method() === "GET") await accountsGate;
			await route.continue();
		});
		const accountsNavigation = page.goto("/accounts");
		await expect(page.getByRole("status")).toHaveText("Loading accounts…");
		releaseAccounts();
		await accountsNavigation;
		await page.unroute("**/api/accounts");

		const checkViewport = async (path: string, heading: string) => {
			for (const width of [390, 768, 1280]) {
				await page.setViewportSize({ width, height: 900 });
				await page.goto(path);
				await expect(
					page.getByRole("heading", { name: heading }),
				).toBeVisible();
				const layout = await page.evaluate(() => ({
					viewport: window.innerWidth,
					document: document.documentElement.scrollWidth,
					main: document.querySelector("main")?.getBoundingClientRect().width,
				}));
				expect(layout.document).toBeLessThanOrEqual(layout.viewport);
				expect(layout.main).toBeLessThanOrEqual(layout.viewport);
			}
		};

		await checkViewport("/accounts", "Accounts");
		await checkViewport("/transactions", "Transaction history");
		await expect(
			page.getByText("No transactions have been recorded yet."),
		).toBeVisible();

		await page.setViewportSize({ width: 390, height: 900 });
		await page.goto("/overview");
		const accountLink = page.getByRole("link", { name: "Accounts" });
		await accountLink.focus();
		await page.keyboard.press("Enter");
		await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();

		const amount = page.getByLabel("Opening balance amount (THB)");
		await amount.focus();
		await page.keyboard.press(selectAllShortcut);
		await page.keyboard.type("10000.00");
		await page.getByLabel("Opening balance date").fill("2026-11-01");
		await page.getByRole("button", { name: "Save opening balance" }).focus();
		await page.keyboard.press("Enter");
		await expect(page.getByRole("status")).toHaveText(
			"Opening balance saved and retrieved from the account record.",
		);

		await checkViewport("/transactions/new", "Receive money");
		await expect(page.getByLabel("Cash account")).toBeVisible();
		await expect(page.getByLabel("Date received")).toBeVisible();
		await expect(page.getByLabel("Total received (THB)")).toBeVisible();
		await expect(page.getByLabel("Allocation 1 amount (THB)")).toBeVisible();
		await page.getByLabel("Date received").fill("2026-11-02");
		for (const [label, value] of [
			["Total received (THB)", "25.00"],
			["Allocation 1 amount (THB)", "24.00"],
		]) {
			const input = page.getByLabel(label);
			await input.focus();
			await page.keyboard.press(selectAllShortcut);
			await page.keyboard.type(value);
		}
		await page.getByRole("button", { name: "Save receipt" }).focus();
		await page.keyboard.press("Enter");
		await expect(page.getByRole("alert")).toHaveText(
			"Allocation amounts must equal the transaction total.",
		);

		await checkViewport("/transactions", "Transaction history");
		await page.route("**/api/transactions", (route) => route.abort("failed"));
		await page.goto("/transactions");
		await expect(page.getByRole("alert")).toHaveText(
			"Transaction history could not be loaded.",
		);
	});

	test("records opening balance and salary, rejects a mismatch, and retrieves persisted history", async ({
		page,
	}) => {
		await signIn(page, E2E_USERS.user);
		await page.getByRole("link", { name: "Accounts" }).click();
		await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
		await page.getByLabel("Opening balance amount (THB)").fill("10000.00");
		await page.getByLabel("Opening balance date").fill("2026-11-01");
		await page.getByRole("button", { name: "Save opening balance" }).click();
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
			"Allocation amounts must equal the transaction total.",
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

		// Hold the POST open and dispatch a second submit event while the first is pending.
		// The component-level guard must prevent a second network request.
		await page.goto("/transactions/new");
		await page.getByLabel("Date received").fill("2026-11-03");
		await page.getByLabel("Total received (THB)").fill("10.00");
		await page.getByLabel("Allocation 1 amount (THB)").fill("10.00");
		let postCount = 0;
		let releasePost!: () => void;
		const postGate = new Promise<void>((resolve) => {
			releasePost = resolve;
		});
		await page.route("**/api/transactions", async (route) => {
			if (route.request().method() === "POST") {
				postCount += 1;
				await postGate;
			}
			await route.continue();
		});
		const form = page.locator("form.transaction-form");
		const firstSubmit = page
			.getByRole("button", { name: "Save receipt" })
			.click();
		await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
		await form.evaluate((node) =>
			node.dispatchEvent(
				new Event("submit", { bubbles: true, cancelable: true }),
			),
		);
		await expect.poll(() => postCount).toBe(1);
		releasePost();
		await firstSubmit;
		await expect(page.getByRole("status")).toHaveText(
			"Saved transaction and verified it with a fresh history read.",
		);
		await page.unroute("**/api/transactions");

		// An ambiguous network failure is reported once and never automatically retried.
		await page.goto("/transactions/new");
		await page.getByLabel("Date received").fill("2026-11-04");
		await page.getByLabel("Total received (THB)").fill("5.00");
		await page.getByLabel("Allocation 1 amount (THB)").fill("5.00");
		let failedPostCount = 0;
		await page.route("**/api/transactions", async (route) => {
			if (route.request().method() === "POST") {
				failedPostCount += 1;
				await new Promise((resolve) => setTimeout(resolve, 250));
				await route.abort("timedout");
				return;
			}
			await route.continue();
		});
		await page.getByRole("button", { name: "Save receipt" }).click();
		await expect(page.getByRole("alert")).toHaveText(
			"We could not confirm whether the request was saved. Check transaction history before submitting again; automatic retry is disabled.",
		);
		await expect.poll(() => failedPostCount).toBe(1);
		await page.waitForTimeout(300);
		expect(failedPostCount).toBe(1);

		const accountsResponse = await page.request.get("/api/accounts");
		expect(accountsResponse.status()).toBe(200);
		const accounts = (await accountsResponse.json()) as {
			name: string;
			balance: string;
		}[];
		expect(accounts.find((account) => account.name === "Bank")?.balance).toBe(
			"30010.00",
		);
		expect(accounts.find((account) => account.name === "Salary")?.balance).toBe(
			"20010.00",
		);
	});

	test("an Administrator cannot open financial pages", async ({ page }) => {
		await signIn(page, E2E_USERS.admin);
		await page.goto("/accounts");
		await expect(page.getByRole("alert")).toHaveText(
			"You do not have access to this operation.",
		);
		await page.goto("/transactions");
		await expect(page.getByRole("alert")).toHaveText(
			"You do not have access to this operation.",
		);
	});

	test("an anonymous visitor is redirected from financial history", async ({
		page,
	}) => {
		await page.goto("/transactions");
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
	});
});
