import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createApp } from "../src/app";
import { ALLOWED_ORIGIN, resetDatabase, TEST_JWT } from "./helpers";

let db: Awaited<ReturnType<typeof resetDatabase>>;
let webDir: string;

beforeAll(async () => {
	webDir = await mkdtemp(join(tmpdir(), "pl-web-"));
	await writeFile(
		join(webDir, "index.html"),
		"<!doctype html><title>PL</title>",
	);
	await writeFile(join(webDir, "app.js"), "console.log(1)");
});
afterAll(() => rm(webDir, { recursive: true, force: true }));
beforeEach(async () => {
	db = await resetDatabase();
});

const get = (app: ReturnType<typeof createApp>, path: string) =>
	app.handle(new Request(`http://localhost${path}`));

describe("health and version for deployment checks", () => {
	test("reports ok, a reachable database and the configured commit", async () => {
		const app = createApp({
			db,
			jwt: TEST_JWT,
			allowedOrigin: ALLOWED_ORIGIN,
			commit: "abc1234",
		});
		const res = await get(app, "/api/health");
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			status: "ok",
			database: "ok",
			commit: "abc1234",
		});
	});
	test("reports unknown commit when none is configured", async () => {
		const app = createApp({ db, jwt: TEST_JWT, allowedOrigin: ALLOWED_ORIGIN });
		const body = (await (await get(app, "/api/health")).json()) as {
			commit: string;
		};
		expect(body.commit).toBe("unknown");
	});
	test("returns 503 when the database cannot be reached", async () => {
		const broken = {
			execute: async () => {
				throw new Error("connection refused");
			},
		} as unknown as typeof db;
		const app = createApp({
			db: broken,
			jwt: TEST_JWT,
			allowedOrigin: ALLOWED_ORIGIN,
		});
		const res = await get(app, "/api/health");
		expect(res.status).toBe(503);
		expect(((await res.json()) as { database: string }).database).toBe(
			"unavailable",
		);
	});
});

describe("serving the built web client from the same origin", () => {
	const appWithWeb = () =>
		createApp({
			db,
			jwt: TEST_JWT,
			allowedOrigin: ALLOWED_ORIGIN,
			webDir,
		});
	test("serves static assets and falls back to index.html for client routes", async () => {
		const app = appWithWeb();
		const asset = await get(app, "/app.js");
		expect(asset.status).toBe(200);
		expect(await asset.text()).toBe("console.log(1)");
		for (const path of ["/", "/login", "/admin/users"]) {
			const page = await get(app, path);
			expect(page.status).toBe(200);
			expect(await page.text()).toContain("<title>PL</title>");
		}
	});
	test("a missing asset is a 404, while a deep client route still loads the app", async () => {
		const app = appWithWeb();
		for (const path of [
			"/assets/missing-abc123.js",
			"/missing.css",
			"/logo.png",
		]) {
			const res = await get(app, path);
			expect(res.status).toBe(404);
			expect(await res.text()).not.toContain("<title>PL</title>");
		}
		const deep = await get(app, "/admin/users/some-id");
		expect(deep.status).toBe(200);
		expect(deep.headers.get("content-type")).toContain("text/html");
	});
	test("unknown API paths stay JSON 404 and never return the client page", async () => {
		const res = await get(appWithWeb(), "/api/nope");
		expect(res.status).toBe(404);
		expect(await res.text()).not.toContain("<title>PL</title>");
	});
	test("path traversal outside the web directory is not served", async () => {
		const res = await get(appWithWeb(), "/..%2f..%2fetc%2fpasswd");
		expect(await res.text()).not.toContain("root:");
	});
});
