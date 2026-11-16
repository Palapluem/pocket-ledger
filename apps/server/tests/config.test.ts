import { describe, expect, test } from "bun:test";

import { loadServerConfig } from "../src/config";

const base = {
	CORS_ORIGIN: "http://localhost:3001",
	DATABASE_URL: "postgresql://x",
	JWT_SECRET: "test-only-secret-that-is-at-least-32-characters-long",
};

describe("server configuration", () => {
	test("token lifetime is 3600 seconds by default", () => {
		expect(loadServerConfig(base).jwt.issuer).toBe("pocket-ledger");
		expect(loadServerConfig(base).jwt.audience).toBe("pocket-ledger-web");
	});
	test("an explicit JWT_TTL_SECONDS other than 3600 is rejected", () => {
		for (const v of ["7200", "60", "0", "-1", "abc", "3600.5", ""]) {
			expect(() => loadServerConfig({ ...base, JWT_TTL_SECONDS: v })).toThrow();
		}
		expect(() =>
			loadServerConfig({ ...base, JWT_TTL_SECONDS: "3600" }),
		).not.toThrow();
	});
	test("a missing or short signing secret is rejected", () => {
		expect(() =>
			loadServerConfig({ ...base, JWT_SECRET: undefined }),
		).toThrow();
		expect(() => loadServerConfig({ ...base, JWT_SECRET: "short" })).toThrow();
	});
});
