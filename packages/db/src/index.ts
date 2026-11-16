import { drizzle } from "drizzle-orm/bun-sql";

import * as schema from "./schema";

export function createDb(databaseUrl: string) {
	return drizzle(databaseUrl, { schema });
}

export type Database = ReturnType<typeof createDb>;
export type AccountType = (typeof schema.accountType.enumValues)[number];
export type TransactionForm =
	(typeof schema.transactionForm.enumValues)[number];
export { schema };
