import { drizzle } from "drizzle-orm/bun-sql";

import * as schema from "./schema";

export function createDb(databaseUrl: string) {
	return drizzle(databaseUrl, { schema });
}

export type Database = ReturnType<typeof createDb>;
export { schema };
