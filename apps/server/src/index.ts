import { createDb } from "@pocket-ledger/db";

import { createApp } from "./app";
import { loadServerConfig } from "./config";

const config = loadServerConfig(process.env);
const app = createApp({
	db: createDb(config.databaseUrl),
	jwt: config.jwt,
	allowedOrigin: config.allowedOrigin,
	secureCookie: config.secureCookie,
});

app.listen(config.port, () => {
	console.log(`Server is running on port ${config.port}`);
});
