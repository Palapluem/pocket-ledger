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

		const accountsResponse = await page.request.get("/api/accounts");
		expect(accountsResponse.status()).toBe(200);
		const accounts = (await accountsResponse.json()) as {
			name: string;
			balance: string;
		}[];
		expect(accounts.find((account) => account.name === "Bank")?.balance).toBe(
			"30000.00",
		);
		expect(accounts.find((account) => account.name === "Salary")?.balance).toBe(
			"20000.00",
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
