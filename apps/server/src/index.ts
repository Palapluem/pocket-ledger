import { createDb } from "@pocket-ledger/db";

import { createApp } from "./app";
import { loadServerConfig } from "./config";

const config = loadServerConfig(process.env);
const app = createApp({
	db: createDb(config.databaseUrl),
	jwt: config.jwt,
	allowedOrigin: config.allowedOrigin,
	secureCookie: config.secureCookie,
	commit: config.commit,
	webDir: config.webDir,
});

app.listen({ port: config.port, hostname: "0.0.0.0" }, () => {
	console.log(`Server is running on port ${config.port}`);
});
