import { expect, test } from "@playwright/test";

import { E2E_USERS } from "../fixtures";

test.describe("TEST-25 / AC-25 F-06 overview loading and failure feedback", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login");
		await page.getByLabel("Email").fill(E2E_USERS.user.email);
		await page.getByLabel("Password").fill(E2E_USERS.user.password);
		await page.getByRole("button", { name: "Sign in" }).click();
		await expect(page.getByRole("heading", { name: "Balances" })).toBeVisible();
	});

	test("a slow read shows a loading status, then the overview", async ({
		page,
	}) => {
		await page.route("**/api/summary", async (route) => {
			await new Promise((r) => setTimeout(r, 1500));
			await route.continue();
		});
		await page.goto("/overview");
		await expect(page.getByRole("status")).toHaveText(
			"Loading your balances, income and expense, and history…",
		);
		await expect(page.getByRole("heading", { name: "Balances" })).toBeVisible();
		await expect(page.getByRole("status")).toHaveCount(0);
	});

	test("a failed read shows a safe error with no figures, and Try again recovers", async ({
		page,
	}) => {
		await page.route("**/api/summary", (route) =>
			route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({
					code: "INTERNAL_ERROR",
					message: "The request could not be completed. Nothing was saved.",
				}),
			}),
		);
		await page.goto("/overview");
		await expect(page.getByRole("alert")).toHaveText(
			"We could not load your balances, income and expense, and history. Check your connection and try again.",
		);
		await expect(page.getByRole("heading", { name: "Balances" })).toHaveCount(
			0,
		);
		await expect(page.getByTestId("income")).toHaveCount(0);

		// A dropped connection is handled the same way.
		await page.unroute("**/api/summary");
		await page.route("**/api/transactions", (route) => route.abort("failed"));
		await page.goto("/overview");
		await expect(page.getByRole("alert")).toBeVisible();

		await page.unroute("**/api/transactions");
		await page.getByRole("button", { name: "Try again" }).click();
		await expect(page.getByRole("heading", { name: "Balances" })).toBeVisible();
		await expect(page.getByRole("alert")).toHaveCount(0);
	});
});
