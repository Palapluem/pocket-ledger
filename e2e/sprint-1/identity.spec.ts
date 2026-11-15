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
};

test.describe("TEST-04 / AC-04 identity journey in the browser", () => {
	test("a protected route sends an anonymous visitor to sign in", async ({
		page,
	}) => {
		await page.goto("/admin/users");
		await expect(page).toHaveURL(/\/login$/);
		await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
	});

	test("wrong credentials show a safe error and do not sign in", async ({
		page,
		context,
	}) => {
		await signIn(page, { email: E2E_USERS.admin.email, password: "wrong" });
		await expect(page.getByRole("alert")).toHaveText(
			"Invalid email or password.",
		);
		await expect(page).toHaveURL(/\/login$/);
		const cookies = await context.cookies();
		expect(cookies.find((c) => c.name === "session")).toBeUndefined();
	});

	test("sign in, use an admin page, sign out, then the browser holds no credential and cannot return", async ({
		page,
		context,
	}) => {
		await signIn(page, E2E_USERS.admin);
		await expect(page).toHaveURL(/\/overview$/);
		await expect(page.getByText("E2E Admin · Administrator")).toBeVisible();

		await page.getByRole("link", { name: "Manage users" }).click();
		await expect(page).toHaveURL(/\/admin\/users$/);
		await expect(
			page.getByRole("cell", { name: E2E_USERS.user.email }),
		).toBeVisible();

		const session = (await context.cookies()).find((c) => c.name === "session");
		expect(session?.httpOnly).toBe(true);
		expect(session?.sameSite).toBe("Lax");

		await page.getByRole("button", { name: "Sign out" }).click();
		await expect(page).toHaveURL(/\/login$/);
		expect(
			(await context.cookies()).find((c) => c.name === "session"),
		).toBeUndefined();

		// Directly requesting protected pages and data from the same browser fails.
		await page.goto("/admin/users");
		await expect(page).toHaveURL(/\/login$/);
		const api = await page.request.get("/api/admin/users");
		expect(api.status()).toBe(401);
		await page.goto("/overview");
		await expect(page).toHaveURL(/\/login$/);
	});

	test("a User cannot see the administration page", async ({ page }) => {
		await signIn(page, E2E_USERS.user);
		await expect(page.getByText("Uma · User")).toBeVisible();
		await expect(page.getByRole("link", { name: "Manage users" })).toHaveCount(
			0,
		);
		await page.goto("/admin/users");
		await expect(page.getByRole("alert")).toHaveText(
			"Only an administrator can manage users.",
		);
		await expect(
			page.getByRole("cell", { name: E2E_USERS.admin.email }),
		).toHaveCount(0);
	});
});
