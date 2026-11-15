import { defineConfig, devices } from "@playwright/test";

// Browser journeys against the real server + built client + disposable test database.
// Requires TEST_DATABASE_URL (scripts/test-db.sh) and a prior `bun run build:web`.
const PORT = Number(process.env.E2E_PORT ?? 4173);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: "e2e",
	fullyParallel: false,
	workers: 1,
	reporter: [["list"]],
	use: { baseURL: BASE_URL, trace: "retain-on-failure" },
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "bun run apps/server/tests/e2e-server.ts",
		url: `${BASE_URL}/api/health`,
		reuseExistingServer: false,
		timeout: 60_000,
		env: { E2E_PORT: String(PORT) },
	},
});
