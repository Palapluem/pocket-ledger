import { cors } from "@elysiajs/cors";
import { createDb } from "@pocket-ledger/db";

import { createApp } from "./app";

function required(name: string) {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required`);
	return value;
}

const allowedOrigin = required("CORS_ORIGIN");
const app = createApp({
	db: createDb(required("DATABASE_URL")),
	jwt: {
		secret: required("JWT_SECRET"),
		issuer: process.env.JWT_ISSUER ?? "pocket-ledger",
		audience: process.env.JWT_AUDIENCE ?? "pocket-ledger-web",
		ttlSeconds: Number(process.env.JWT_TTL_SECONDS ?? 3600),
	},
	allowedOrigin,
	secureCookie: process.env.COOKIE_SECURE === "true",
});

app
	.use(
		cors({
			origin: allowedOrigin,
			methods: ["GET", "POST", "DELETE", "OPTIONS"],
			credentials: true,
		}),
	)
	.listen(Number(process.env.PORT ?? 3000), () => {
		console.log(`Server is running on port ${process.env.PORT ?? 3000}`);
	});
