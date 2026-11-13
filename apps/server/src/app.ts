import { Elysia } from "elysia";

import type { Database } from "@pocket-ledger/db";

export type AppConfig = {
	db: Database;
	jwt: { secret: string; issuer: string; audience: string; ttlSeconds: number };
	allowedOrigin: string;
};

// Intentionally empty: tests are committed first to show them failing (red) before implementation.
export function createApp(_config: AppConfig) {
	return new Elysia();
}
