export type Identity = {
	id: string;
	displayName: string;
	role: "user" | "administrator";
};

export type ManagedUser = {
	id: string;
	email: string;
	displayName: string;
	role: "user" | "administrator";
	enabled: boolean;
};

export class ApiError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
	) {
		super(message);
	}
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(path, {
		credentials: "same-origin",
		...init,
		headers: {
			...(init.body ? { "content-type": "application/json" } : {}),
			...init.headers,
		},
	});
	if (res.status === 204) return undefined as T;
	const body = (await res.json().catch(() => ({}))) as {
		code?: string;
		message?: string;
	};
	if (!res.ok)
		throw new ApiError(
			res.status,
			body.code ?? "ERROR",
			body.message ?? "Something went wrong. Try again.",
		);
	return body as T;
}

export const api = {
	signIn: (email: string, password: string) =>
		request<Identity>("/api/session", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		}),
	currentIdentity: async () => {
		try {
			return await request<Identity>("/api/session");
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) return null;
			throw error;
		}
	},
	signOut: () => request<void>("/api/session", { method: "DELETE" }),
	listUsers: () => request<ManagedUser[]>("/api/admin/users"),
	setEnabled: (id: string, enabled: boolean) =>
		request<ManagedUser>(`/api/admin/users/${id}`, {
			method: "PATCH",
			body: JSON.stringify({ enabled }),
		}),
	health: () => request<{ status: string; commit: string }>("/api/health"),
};
