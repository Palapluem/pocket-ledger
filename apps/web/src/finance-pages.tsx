import { Link } from "@tanstack/react-router";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import { type Account, ApiError, api, type Transaction } from "./api";
import { bangkokToday } from "./finance";

const accountTypeLabel: Record<Account["type"], string> = {
	CASH: "Cash",
	LOAN_GIVEN: "Loan given",
	LOAN_TAKEN: "Loan taken",
	INCOME: "Income",
	EXPENSE: "Expense",
};

function errorMessage(error: unknown, fallback: string) {
	return error instanceof ApiError ? error.message : fallback;
}

function PageNavigation() {
	return (
		<nav className="row page-navigation" aria-label="Financial pages">
			<Link to="/overview">Overview</Link>
			<Link to="/accounts">Accounts</Link>
			<Link to="/transactions/receive">Receive money</Link>
			<Link to="/transactions/new">Make a payment or record a charge</Link>
			<Link to="/transactions">Transaction history</Link>
		</nav>
	);
}

function OpeningBalanceEditor({
	account,
	onSaved,
}: {
	account: Account;
	onSaved: (account: Account) => void;
}) {
	const [amount, setAmount] = useState(account.openingAmount);
	const [date, setDate] = useState(account.openingDate ?? bangkokToday());
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string>();
	const [status, setStatus] = useState<string>();

	const save = async (event: FormEvent) => {
		event.preventDefault();
		setError(undefined);
		setStatus(undefined);
		setSaving(true);
		try {
			await api.updateOpeningBalance(account.id, amount, date);
			const confirmed = await api.getAccount(account.id);
			onSaved(confirmed);
			setStatus("Opening balance saved and retrieved from the account record.");
		} catch (e) {
			setError(
				errorMessage(
					e,
					"The opening balance could not be confirmed. You may retry this update.",
				),
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<form className="opening-form" onSubmit={save}>
			<h3>Opening balance</h3>
			<label>
				Amount (THB)
				<input
					aria-label="Opening balance amount (THB)"
					inputMode="decimal"
					required
					value={amount}
					onChange={(event) => setAmount(event.target.value)}
				/>
			</label>
			<label>
				Effective date
				<input
					aria-label="Opening balance date"
					type="date"
					max={bangkokToday()}
					required
					value={date}
					onChange={(event) => setDate(event.target.value)}
				/>
			</label>
			{error && (
				<p className="error" role="alert">
					{error}
				</p>
			)}
			{status && (
				<p className="success" role="status">
					{status}
				</p>
			)}
			<button type="submit" disabled={saving}>
				{saving ? "Saving…" : "Save opening balance"}
			</button>
		</form>
	);
}

function PaymentLimitEditor({
	account,
	onSaved,
}: {
	account: Account;
	onSaved: (account: Account) => void;
}) {
	const [limit, setLimit] = useState(account.paymentLimit ?? "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string>();
	const [status, setStatus] = useState<string>();

	const submit = async (next: string | null, success: string) => {
		setError(undefined);
		setStatus(undefined);
		setSaving(true);
		try {
			await api.updatePaymentLimit(account.id, next);
			const confirmed = await api.getAccount(account.id);
			onSaved(confirmed);
			setLimit(confirmed.paymentLimit ?? "");
			setStatus(success);
		} catch (e) {
			setError(
				errorMessage(
					e,
					"The payment limit could not be confirmed. You may retry this update.",
				),
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<form
			className="opening-form"
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				void submit(
					limit,
					"Payment limit saved and retrieved from the account record.",
				);
			}}
		>
			<h3>Payment limit</h3>
			<p className="muted">
				Current limit:{" "}
				{account.paymentLimit ? `฿${account.paymentLimit}` : "No limit"}
			</p>
			<label>
				Amount (THB)
				<input
					aria-label="Payment limit amount (THB)"
					inputMode="decimal"
					value={limit}
					onChange={(event) => setLimit(event.target.value)}
				/>
			</label>
			{error && (
				<p className="error" role="alert">
					{error}
				</p>
			)}
			{status && (
				<p className="success" role="status">
					{status}
				</p>
			)}
			<div className="row">
				<button type="submit" disabled={saving}>
					{saving ? "Saving…" : "Save payment limit"}
				</button>
				<button
					type="button"
					disabled={saving}
					onClick={() => void submit(null, "Payment limit cleared.")}
				>
					Clear payment limit
				</button>
			</div>
		</form>
	);
}

export function AccountsPage() {
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string>();
	const loadActiveRef = useRef(false);

	const loadAccounts = useCallback(async () => {
		setLoading(true);
		setError(undefined);
		try {
			const value = await api.accounts();
			if (loadActiveRef.current) setAccounts(value);
		} catch (reason) {
			if (loadActiveRef.current)
				setError(
					errorMessage(reason, "Accounts could not be loaded. Try again."),
				);
		} finally {
			if (loadActiveRef.current) setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadActiveRef.current = true;
		void loadAccounts();
		return () => {
			loadActiveRef.current = false;
		};
	}, [loadAccounts]);

	const updateAccount = (updated: Account) =>
		setAccounts((current) =>
			current.map((account) => (account.id === updated.id ? updated : account)),
		);

	return (
		<section className="card wide financial-page">
			<h1>Accounts</h1>
			<p className="muted">Balances and opening amounts for your accounts.</p>
			<PageNavigation />
			{loading && <p role="status">Loading accounts…</p>}
			{error && (
				<div>
					<p className="error" role="alert">
						{error}
					</p>
					<button type="button" onClick={() => void loadAccounts()}>
						Retry loading accounts
					</button>
				</div>
			)}
			{!loading && !error && accounts.length === 0 && (
				<p className="empty-state">
					No financial accounts are available for this User.
				</p>
			)}
			{accounts.length > 0 && (
				<div className="account-grid">
					{accounts.map((account) => (
						<article className="account-card" key={account.id}>
							<div className="row account-heading">
								<h2>{account.name}</h2>
								<span className="badge">{accountTypeLabel[account.type]}</span>
							</div>
							<dl className="balance-list">
								<div>
									<dt>Current balance</dt>
									<dd>฿{account.balance}</dd>
								</div>
								<div>
									<dt>Opening balance</dt>
									<dd>฿{account.openingAmount}</dd>
								</div>
								<div>
									<dt>Opening date</dt>
									<dd>{account.openingDate ?? "Not set"}</dd>
								</div>
							</dl>
							{account.type === "CASH" && (
								<OpeningBalanceEditor
									account={account}
									onSaved={updateAccount}
								/>
							)}
							{account.type === "LOAN_TAKEN" && (
								<PaymentLimitEditor account={account} onSaved={updateAccount} />
							)}
						</article>
					))}
				</div>
			)}
		</section>
	);
}

type AllocationDraft = { accountId: string; amount: string };

export function ReceiveMoneyPage() {
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [primaryAccountId, setPrimaryAccountId] = useState("");
	const [date, setDate] = useState(bangkokToday());
	const [total, setTotal] = useState("");
	const [allocations, setAllocations] = useState<AllocationDraft[]>([
		{ accountId: "", amount: "" },
	]);
	const [memo, setMemo] = useState("");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const submittingRef = useRef(false);
	const loadActiveRef = useRef(false);
	const [loadError, setLoadError] = useState<string>();
	const [error, setError] = useState<string>();
	const [status, setStatus] = useState<string>();
	const [saved, setSaved] = useState<Transaction>();
	const [incomeAccounts, setIncomeAccounts] = useState<Account[]>([]);
	const [cashAccounts, setCashAccounts] = useState<Account[]>([]);

	const loadAccounts = useCallback(async () => {
		setLoading(true);
		setLoadError(undefined);
		try {
			const value = await api.accounts();
			if (!loadActiveRef.current) return;
			const cash = value.filter((account) => account.type === "CASH");
			const income = value.filter((account) => account.type === "INCOME");
			setAccounts(value);
			setCashAccounts(cash);
			setIncomeAccounts(income);
			setPrimaryAccountId(cash[0]?.id ?? "");
			setAllocations([{ accountId: income[0]?.id ?? "", amount: "" }]);
		} catch (reason) {
			if (loadActiveRef.current)
				setLoadError(
					errorMessage(reason, "Accounts could not be loaded. Try again."),
				);
		} finally {
			if (loadActiveRef.current) setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadActiveRef.current = true;
		void loadAccounts();
		return () => {
			loadActiveRef.current = false;
		};
	}, [loadAccounts]);

	const updateTotal = (next: string) => {
		setTotal(next);
		setAllocations((current) =>
			current.map((line) => ({
				...line,
				amount: line.amount === total ? next : line.amount,
			})),
		);
	};

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		if (submittingRef.current) return;
		submittingRef.current = true;
		setError(undefined);
		setStatus(undefined);
		setSaved(undefined);
		setSubmitting(true);
		let created: Transaction;
		try {
			created = await api.createTransaction({
				form: "RECEIVE",
				primaryAccountId,
				date,
				total,
				allocations,
				...(memo.trim() ? { memo: memo.trim() } : {}),
			});
			setSaved(created);
		} catch (e) {
			if (e instanceof ApiError) setError(e.message);
			else
				setError(
					"We could not confirm whether the request was saved. Check transaction history before submitting again; automatic retry is disabled.",
				);
			submittingRef.current = false;
			setSubmitting(false);
			return;
		}

		try {
			const [verified, refreshed] = await Promise.all([
				api.getTransaction(created.id),
				api.accounts(),
			]);
			setSaved(verified);
			setAccounts(refreshed);
			setCashAccounts(refreshed.filter((account) => account.type === "CASH"));
			setIncomeAccounts(
				refreshed.filter((account) => account.type === "INCOME"),
			);
			setStatus("Saved transaction and verified it with a fresh history read.");
		} catch {
			setError(
				"The server accepted the receipt, but a fresh history or balance read failed. Check transaction history before submitting again.",
			);
		} finally {
			submittingRef.current = false;
			setSubmitting(false);
		}
	};

	const usedIncomeIds = new Set(allocations.map((line) => line.accountId));

	return (
		<section className="card wide financial-page">
			<h1>Receive money</h1>
			<p className="muted">
				Record salary received into your own cash account.
			</p>
			<PageNavigation />
			{loading && <p role="status">Loading accounts…</p>}
			{!loading && loadError && (
				<div>
					<p className="error" role="alert">
						{loadError}
					</p>
					<button type="button" onClick={() => void loadAccounts()}>
						Retry loading accounts
					</button>
				</div>
			)}
			{!loading &&
				!loadError &&
				(cashAccounts.length === 0 || incomeAccounts.length === 0) && (
					<p className="empty-state">
						A Cash account and an Income account are required before recording a
						receipt.
					</p>
				)}
			{!loading &&
				!loadError &&
				cashAccounts.length > 0 &&
				incomeAccounts.length > 0 && (
					<form className="transaction-form" onSubmit={submit}>
						<label>
							Cash account
							<select
								required
								value={primaryAccountId}
								onChange={(event) => setPrimaryAccountId(event.target.value)}
							>
								{cashAccounts.map((account) => (
									<option key={account.id} value={account.id}>
										{account.name} · ฿{account.balance}
									</option>
								))}
							</select>
						</label>
						<label>
							Date received
							<input
								aria-label="Date received"
								type="date"
								required
								value={date}
								onChange={(event) => setDate(event.target.value)}
							/>
						</label>
						<label>
							Total received (THB)
							<input
								aria-label="Total received (THB)"
								inputMode="decimal"
								required
								value={total}
								onChange={(event) => updateTotal(event.target.value)}
							/>
						</label>
						<fieldset className="allocation-fieldset">
							<legend>Allocate receipt</legend>
							{allocations.map((line, index) => {
								const available = incomeAccounts.filter(
									(account) =>
										account.id === line.accountId ||
										!usedIncomeIds.has(account.id),
								);
								return (
									<div
										className="allocation-row"
										key={line.accountId || `line-${index}`}
									>
										<label>
											Income account
											<select
												required
												value={line.accountId}
												onChange={(event) =>
													setAllocations((current) =>
														current.map((item, i) =>
															i === index
																? { ...item, accountId: event.target.value }
																: item,
														),
													)
												}
											>
												{available.map((account) => (
													<option key={account.id} value={account.id}>
														{account.name}
													</option>
												))}
											</select>
										</label>
										<label>
											Allocation amount (THB)
											<input
												aria-label={`Allocation ${index + 1} amount (THB)`}
												inputMode="decimal"
												required
												value={line.amount}
												onChange={(event) =>
													setAllocations((current) =>
														current.map((item, i) =>
															i === index
																? { ...item, amount: event.target.value }
																: item,
														),
													)
												}
											/>
										</label>
										{allocations.length > 1 && (
											<button
												className="secondary"
												type="button"
												onClick={() =>
													setAllocations((current) =>
														current.filter((_, i) => i !== index),
													)
												}
											>
												Remove allocation {index + 1}
											</button>
										)}
									</div>
								);
							})}
							<button
								className="secondary"
								type="button"
								disabled={incomeAccounts.every((account) =>
									usedIncomeIds.has(account.id),
								)}
								onClick={() => {
									const next = incomeAccounts.find(
										(account) => !usedIncomeIds.has(account.id),
									);
									if (next)
										setAllocations((current) => [
											...current,
											{ accountId: next.id, amount: "" },
										]);
								}}
							>
								Add allocation
							</button>
							<p className="muted">
								Allocation amounts must add up exactly to the total. The server
								validates this before saving.
							</p>
						</fieldset>
						<label>
							Memo (optional)
							<input
								value={memo}
								maxLength={200}
								onChange={(event) => setMemo(event.target.value)}
							/>
						</label>
						{error && (
							<p className="error" role="alert">
								{error}
							</p>
						)}
						{status && (
							<p className="success" role="status">
								{status}
							</p>
						)}
						<button type="submit" disabled={submitting || Boolean(saved)}>
							{submitting ? "Saving…" : saved ? "Saved" : "Save receipt"}
						</button>
						{saved && (
							<p className="saved-record">
								Saved {saved.form.toLowerCase()} of ฿{saved.total} on{" "}
								{saved.date}.{" "}
								<Link to="/transactions">View transaction history</Link>
							</p>
						)}
					</form>
				)}
			{accounts.length > 0 && (
				<p className="muted">
					Your account records remain private to your User identity.
				</p>
			)}
		</section>
	);
}

export function TransactionHistoryPage() {
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [selected, setSelected] = useState<Transaction>();
	const [loading, setLoading] = useState(true);
	const [loadingId, setLoadingId] = useState<string>();
	const [error, setError] = useState<string>();

	useEffect(() => {
		let active = true;
		Promise.all([api.accounts(), api.transactions()])
			.then(
				([accountRows, transactionRows]) => {
					if (!active) return;
					setAccounts(accountRows);
					setTransactions(transactionRows);
				},
				(reason: unknown) => {
					if (active)
						setError(
							errorMessage(reason, "Transaction history could not be loaded."),
						);
				},
			)
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, []);

	const viewDetail = async (transactionId: string) => {
		setError(undefined);
		setLoadingId(transactionId);
		try {
			setSelected(await api.getTransaction(transactionId));
		} catch (e) {
			setError(
				errorMessage(e, "The saved transaction detail could not be loaded."),
			);
		} finally {
			setLoadingId(undefined);
		}
	};

	const accountName = (id: string) =>
		accounts.find((account) => account.id === id)?.name ??
		"Unavailable account";

	return (
		<section className="card wide financial-page">
			<h1>Transaction history</h1>
			<p className="muted">
				Your saved transactions and their account allocations.
			</p>
			<PageNavigation />
			{loading && <p role="status">Loading transaction history…</p>}
			{error && (
				<p className="error" role="alert">
					{error}
				</p>
			)}
			{!loading && !error && transactions.length === 0 && (
				<p className="empty-state">No transactions have been recorded yet.</p>
			)}
			{transactions.length > 0 && (
				<table>
					<thead>
						<tr>
							<th scope="col">Date</th>
							<th scope="col">Type</th>
							<th scope="col">Total</th>
							<th scope="col">Details</th>
						</tr>
					</thead>
					<tbody>
						{transactions.map((transaction) => (
							<tr key={transaction.id}>
								<td>{transaction.date}</td>
								<td>
									{transaction.form === "RECEIVE" ? "Receive" : "Payment"}
								</td>
								<td>฿{transaction.total}</td>
								<td>
									<button
										type="button"
										className="secondary"
										disabled={loadingId === transaction.id}
										onClick={() => viewDetail(transaction.id)}
									>
										{loadingId === transaction.id
											? "Loading…"
											: `View ${transaction.date} transaction`}
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
			{selected && (
				<article
					className="detail-card"
					aria-labelledby="transaction-detail-title"
				>
					<h2 id="transaction-detail-title">Transaction detail</h2>
					<dl className="balance-list">
						<div>
							<dt>Type</dt>
							<dd>{selected.form}</dd>
						</div>
						<div>
							<dt>Date</dt>
							<dd>{selected.date}</dd>
						</div>
						<div>
							<dt>Primary account</dt>
							<dd>{accountName(selected.primaryAccountId)}</dd>
						</div>
						<div>
							<dt>Total</dt>
							<dd>฿{selected.total}</dd>
						</div>
						<div>
							<dt>Memo</dt>
							<dd>{selected.memo ?? "—"}</dd>
						</div>
					</dl>
					<h3>Allocations</h3>
					<ul>
						{selected.allocations.map((allocation) => (
							<li key={allocation.accountId}>
								{accountName(allocation.accountId)} · ฿{allocation.amount}
							</li>
						))}
					</ul>
				</article>
			)}
		</section>
	);
}
