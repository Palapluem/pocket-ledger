import {
	createRootRoute,
	createRoute,
	createRouter,
	Link,
	Outlet,
	RouterProvider,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { ApiError, api, type ManagedUser } from "./api";
import { MoneyOverview, PaymentForm } from "./finance";
import "./styles.css";

function Footer() {
	const [commit, setCommit] = useState<string>();
	useEffect(() => {
		api
			.health()
			.then((h) => setCommit(h.commit))
			.catch(() => setCommit("unavailable"));
	}, []);
	return (
		<footer>
			PocketLedger · version <code>{commit ?? "…"}</code>
		</footer>
	);
}

const rootRoute = createRootRoute({
	component: () => (
		<div className="shell">
			<header>
				<strong>PocketLedger</strong>
			</header>
			<main>
				<Outlet />
			</main>
			<Footer />
		</div>
	),
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	beforeLoad: async () => {
		const me = await api.currentIdentity();
		throw redirect({ to: me ? "/overview" : "/login" });
	},
});

function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string>();
	const [submitting, setSubmitting] = useState(false);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(undefined);
		setSubmitting(true);
		try {
			await api.signIn(email, password);
			await navigate({ to: "/overview" });
		} catch (e) {
			setError(
				e instanceof ApiError ? e.message : "Sign-in failed. Try again.",
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<form onSubmit={submit} aria-labelledby="login-title" className="card">
			<h1 id="login-title">Sign in</h1>
			<label>
				Email
				<input
					type="email"
					autoComplete="username"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
			</label>
			<label>
				Password
				<input
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
			</label>
			{error && (
				<p role="alert" className="error">
					{error}
				</p>
			)}
			<button type="submit" disabled={submitting}>
				{submitting ? "Signing in…" : "Sign in"}
			</button>
		</form>
	);
}

const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	component: LoginPage,
});

const overviewRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/overview",
	beforeLoad: async () => {
		const me = await api.currentIdentity();
		if (!me) throw redirect({ to: "/login" });
		return { me };
	},
	loader: async ({ context }) =>
		context.me.role === "user"
			? {
					money: await Promise.all([api.summary(), api.transactions()]),
				}
			: { money: null },
	component: OverviewPage,
});

function SignOutButton() {
	const navigate = useNavigate();
	return (
		<button
			type="button"
			className="secondary"
			onClick={async () => {
				await api.signOut();
				await navigate({ to: "/login" });
			}}
		>
			Sign out
		</button>
	);
}

function OverviewPage() {
	const { me } = overviewRoute.useRouteContext();
	const { money } = overviewRoute.useLoaderData();
	return (
		<section className={money ? "card wide" : "card"}>
			<h1>Signed in</h1>
			<p>
				{me.displayName} ·{" "}
				{me.role === "administrator" ? "Administrator" : "User"}
			</p>
			<nav className="row">
				{me.role === "administrator" && (
					<Link to="/admin/users">Manage users</Link>
				)}
				{money && (
					<Link to="/transactions/new">Make a payment or record a charge</Link>
				)}
				<SignOutButton />
			</nav>
			{money && <MoneyOverview summary={money[0]} transactions={money[1]} />}
		</section>
	);
}

const adminRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/admin/users",
	beforeLoad: async () => {
		const me = await api.currentIdentity();
		if (!me) throw redirect({ to: "/login" });
		return { me };
	},
	loader: async () => {
		try {
			return { users: await api.listUsers(), forbidden: false };
		} catch (e) {
			if (e instanceof ApiError && e.status === 403)
				return { users: [] as ManagedUser[], forbidden: true };
			throw e;
		}
	},
	component: AdminUsersPage,
});

function AdminUsersPage() {
	const { users, forbidden } = adminRoute.useLoaderData();
	const router = useRouter();
	const [error, setError] = useState<string>();
	const [busy, setBusy] = useState<string>();

	if (forbidden)
		return (
			<section className="card">
				<h1>Manage users</h1>
				<p role="alert" className="error">
					Only an administrator can manage users.
				</p>
				<Link to="/overview">Back</Link>
			</section>
		);

	const toggle = async (user: ManagedUser) => {
		setError(undefined);
		setBusy(user.id);
		try {
			await api.setEnabled(user.id, !user.enabled);
			await router.invalidate();
		} catch (e) {
			setError(e instanceof ApiError ? e.message : "Update failed.");
		} finally {
			setBusy(undefined);
		}
	};

	return (
		<section className="card wide">
			<h1>Manage users</h1>
			{error && (
				<p role="alert" className="error">
					{error}
				</p>
			)}
			<table>
				<thead>
					<tr>
						<th scope="col">Name</th>
						<th scope="col">Email</th>
						<th scope="col">Role</th>
						<th scope="col">Status</th>
						<th scope="col">Action</th>
					</tr>
				</thead>
				<tbody>
					{users.map((u) => (
						<tr key={u.id}>
							<td>{u.displayName}</td>
							<td>{u.email}</td>
							<td>{u.role}</td>
							<td>{u.enabled ? "Enabled" : "Disabled"}</td>
							<td>
								<button
									type="button"
									className="secondary"
									disabled={busy === u.id}
									onClick={() => toggle(u)}
									aria-label={`${u.enabled ? "Disable" : "Enable"} ${u.displayName}`}
								>
									{u.enabled ? "Disable" : "Enable"}
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<nav className="row">
				<Link to="/overview">Back</Link>
				<SignOutButton />
			</nav>
		</section>
	);
}

const newPaymentRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/transactions/new",
	beforeLoad: async () => {
		const me = await api.currentIdentity();
		if (!me) throw redirect({ to: "/login" });
		if (me.role !== "user") throw redirect({ to: "/overview" });
		return { me };
	},
	loader: async () => ({ accounts: await api.accounts() }),
	component: NewPaymentPage,
});

function NewPaymentPage() {
	const { accounts } = newPaymentRoute.useLoaderData();
	const navigate = useNavigate();
	return (
		<PaymentForm
			accounts={accounts}
			onSaved={() => navigate({ to: "/overview" })}
		/>
	);
}

const router = createRouter({
	routeTree: rootRoute.addChildren([
		indexRoute,
		loginRoute,
		overviewRoute,
		adminRoute,
		newPaymentRoute,
	]),
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const root = document.getElementById("root");
if (root)
	createRoot(root).render(
		<StrictMode>
			<RouterProvider router={router} />
		</StrictMode>,
	);
