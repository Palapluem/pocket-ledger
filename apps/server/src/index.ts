import { cors } from "@elysiajs/cors";
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

app
	.use(
		cors({
			origin: config.allowedOrigin,
			methods: ["GET", "POST", "DELETE", "OPTIONS"],
			credentials: true,
		}),
	)
	.listen(config.port, () => {
		console.log(`Server is running on port ${config.port}`);
	});
