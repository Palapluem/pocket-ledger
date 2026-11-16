export const E2E_USERS = {
	admin: {
		email: "admin@e2e.test",
		displayName: "E2E Admin",
		role: "administrator" as const,
		password: "e2e-admin-pass",
	},
	user: {
		email: "uma@e2e.test",
		displayName: "Uma",
		role: "user" as const,
		password: "e2e-user-pass",
	},
	payer: {
		email: "pat@e2e.test",
		displayName: "Pat",
		role: "user" as const,
		password: "e2e-payer-pass",
	},
	retry: {
		email: "rae@e2e.test",
		displayName: "Rae",
		role: "user" as const,
		password: "e2e-retry-pass",
	},
};
