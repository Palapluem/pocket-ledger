import { expect, test } from "@playwright/test";

import { E2E_USERS } from "../fixtures";

const signIn = async (page: import("@playwright/test").Page) => {
	await page.goto("/login");
	await page.getByLabel("Email").fill(E2E_USERS.user.email);
	await page.getByLabel("Password").fill(E2E_USERS.user.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/overview$/);
};

const expectNoHorizontalOverflow = async (
	page: import("@playwright/test").Page,
) => {
	const overflows = await page.evaluate(
		() =>
			document.documentElement.scrollWidth >
			document.documentElement.clientWidth,
	);
	expect(overflows).toBe(false);
};

test("TEST-25 / AC-25 labelled flows fit target widths and support keyboard focus", async ({
	page,
}) => {
	for (const width of [390, 768, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto("/login");
		await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
		const email = page.getByLabel("Email");
		const password = page.getByLabel("Password");
		await email.focus();
		await page.keyboard.press("Tab");
		await expect(password).toBeFocused();
		await page.keyboard.press("Tab");
		await expect(page.getByRole("button", { name: "Sign in" })).toBeFocused();
		await expectNoHorizontalOverflow(page);
	}

	await signIn(page);
	await page.setViewportSize({ width: 390, height: 900 });
	await page.addInitScript(() => {
		const originalFetch = window.fetch.bind(window);
		window.fetch = async (input, init) => {
			const rawUrl = input instanceof Request ? input.url : String(input);
			const url = new URL(rawUrl, window.location.href);
			const mode = window.sessionStorage.getItem("e2e-accounts-mode");
			if (url.pathname !== "/api/accounts" || !mode)
				return originalFetch(input, init);
			window.sessionStorage.removeItem("e2e-accounts-mode");
			if (mode === "loading") {
				await new Promise((resolve) => setTimeout(resolve, 400));
				return originalFetch(input, init);
			}
			if (mode === "empty")
				return new Response("[]", {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			return new Response(
				JSON.stringify({
					code: "SERVICE_UNAVAILABLE",
					message: "Accounts could not be loaded. Try again.",
				}),
				{
					status: 503,
					headers: { "content-type": "application/json" },
				},
			);
		};
	});
	await page.evaluate(() =>
		sessionStorage.setItem("e2e-accounts-mode", "loading"),
	);
	await page.goto("/accounts");
	await expect(page.getByRole("status")).toHaveText("Loading accounts…");
	await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();

	for (const width of [390, 768, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto("/accounts");
		await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();
		const amount = page.getByLabel("Opening balance amount (THB)").first();
		const date = page.getByLabel("Opening balance date").first();
		await amount.focus();
		await page.keyboard.press("Tab");
		await expect(date).toBeFocused();
		await expect(
			page.getByRole("button", { name: "Save opening balance" }).first(),
		).toBeVisible();
		await expectNoHorizontalOverflow(page);

		await page.getByRole("link", { name: "Receive money" }).click();
		await expect(page.getByLabel("Date received")).toBeVisible();
		await expect(page.getByLabel("Cash account")).toBeVisible();
		await expect(page.getByLabel("Total received (THB)")).toBeVisible();
		await expectNoHorizontalOverflow(page);

		await page
			.getByRole("link", { name: "Make a payment or record a charge" })
			.click();
		await expect(page.getByLabel("Pay from or charge to")).toBeVisible();
		await expect(page.getByLabel("Total (THB)")).toBeVisible();
		await expectNoHorizontalOverflow(page);

		await page.goto("/transactions");
		await expect(
			page.getByRole("heading", { name: "Transaction history" }),
		).toBeVisible();
		await expectNoHorizontalOverflow(page);
	}

	// Fixture-backed UI states: the real API tests separately prove persistence and authorization.
	await page.evaluate(() =>
		sessionStorage.setItem("e2e-accounts-mode", "empty"),
	);
	await page.goto("/accounts");
	await expect(
		page.getByText("No financial accounts are available for this User."),
	).toBeVisible();

	await page.evaluate(() =>
		sessionStorage.setItem("e2e-accounts-mode", "error"),
	);
	await page.goto("/accounts");
	await expect(page.getByRole("alert")).toHaveText(
		"Accounts could not be loaded. Try again.",
	);
});
