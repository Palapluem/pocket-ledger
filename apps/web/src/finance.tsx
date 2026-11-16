import { Link, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";

import {
	type Account,
	type AccountType,
	ApiError,
	api,
	type Summary,
	type Transaction,
	UncertainOutcome,
} from "./api";

const TYPE_LABEL: Record<AccountType, string> = {
	CASH: "Cash / bank",
	LOAN_TAKEN: "Loan taken / card",
	LOAN_GIVEN: "Loan given",
	INCOME: "Income",
	EXPENSE: "Expense",
};

/** "1200.00" -> "1,200.00" without converting through floating point. */
export const money = (value: string) => {
	const [whole = "0", cents = "00"] = value.replace("-", "").split(".");
	const sign = value.startsWith("-") ? "-" : "";
	return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
};

const toSatang = (value: string) => {
	const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(value.trim());
	return match
		? BigInt(match[1] ?? "0") * 100n + BigInt((match[2] ?? "").padEnd(2, "0"))
		: null;
};
const fromSatang = (minor: bigint) =>
	`${minor < 0n ? "-" : ""}${(minor < 0n ? -minor : minor) / 100n}.${((minor < 0n ? -minor : minor) % 100n).toString().padStart(2, "0")}`;

export const bangkokToday = () =>
	new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
		new Date(),
	);

/** Shown while a financial view's data is being fetched. */
export function Loading(props: { label: string }) {
	return (
		<section className="card" aria-busy="true">
			<p role="status">{props.label}</p>
		</section>
	);
}

/**
 * A load failure never shows partial or stale figures, and never exposes server
 * details; the User can retry the read (reads have no financial effect).
 */
export function LoadFailed(props: { what: string }) {
	const router = useRouter();
	const [retrying, setRetrying] = useState(false);
	return (
		<section className="card">
			<h1>Something went wrong</h1>
			<p role="alert" className="error">
				We could not load {props.what}. Check your connection and try again.
			</p>
			<div className="row">
				<button
					type="button"
					disabled={retrying}
					onClick={async () => {
						setRetrying(true);
						try {
							await router.invalidate();
						} finally {
							setRetrying(false);
						}
					}}
				>
					{retrying ? "Retrying…" : "Try again"}
				</button>
			</div>
		</section>
	);
}

export function MoneyOverview(props: {
	summary: Summary;
	transactions: Transaction[];
}) {
	const { summary, transactions } = props;
	const names = new Map(summary.accounts.map((a) => [a.id, a.name]));
	return (
		<>
			<section aria-labelledby="balances-title">
				<h2 id="balances-title">Balances</h2>
				<table>
					<thead>
						<tr>
							<th scope="col">Account</th>
							<th scope="col">Type</th>
							<th scope="col" className="num">
								Balance (THB)
							</th>
						</tr>
					</thead>
					<tbody>
						{summary.accounts.map((a) => (
							<tr key={a.id}>
								<th scope="row">{a.name}</th>
								<td>{TYPE_LABEL[a.type]}</td>
								<td className="num" data-testid={`balance-${a.name}`}>
									{money(a.balance)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</section>
			<section aria-labelledby="summary-title" className="row">
				<h2 id="summary-title" className="sr-only">
					Income and expense
				</h2>
				<p>
					Income <strong data-testid="income">{money(summary.income)}</strong>
				</p>
				<p>
					Expense{" "}
					<strong data-testid="expense">{money(summary.expense)}</strong>
				</p>
			</section>
			<section aria-labelledby="history-title">
				<h2 id="history-title">History</h2>
				{transactions.length === 0 ? (
					<p className="muted">No transactions yet.</p>
				) : (
					<ul className="history">
						{transactions.map((t) => (
							<li key={t.id}>
								<div className="row spread">
									<span>
										{t.date} ·{" "}
										{t.form === "RECEIVE"
											? "Received into"
											: "Paid from / charged to"}{" "}
										{names.get(t.primaryAccountId)}
									</span>
									<strong>{money(t.total)}</strong>
								</div>
								<ul className="muted">
									{t.allocations.map((l) => (
										<li key={l.accountId}>
											{names.get(l.accountId)}: {money(l.amount)}
										</li>
									))}
								</ul>
								{t.memo && <p className="muted">{t.memo}</p>}
							</li>
						))}
					</ul>
				)}
			</section>
		</>
	);
}

/** PAYMENT allocation types allowed by the System SDS effect matrix. */
const PAYMENT_LINE_TYPES: AccountType[] = [
	"EXPENSE",
	"LOAN_TAKEN",
	"LOAN_GIVEN",
	"CASH",
];

type Line = { key: number; accountId: string; amount: string };

export function PaymentForm(props: {
	accounts: Account[];
	onSaved: () => Promise<void>;
}) {
	const { accounts, onSaved } = props;
	const primaries = accounts.filter(
		(a) => a.type === "CASH" || a.type === "LOAN_TAKEN",
	);
	const [primaryAccountId, setPrimary] = useState(primaries[0]?.id ?? "");
	const [date, setDate] = useState(bangkokToday());
	const [total, setTotal] = useState("");
	const [memo, setMemo] = useState("");
	const nextKey = useRef(1);
	const [lines, setLines] = useState<Line[]>([
		{ key: 0, accountId: "", amount: "" },
	]);
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);
	// Blocks a second activation synchronously, before React re-renders the button.
	const inFlight = useRef(false);

	const lineChoices = accounts.filter(
		(a) => PAYMENT_LINE_TYPES.includes(a.type) && a.id !== primaryAccountId,
	);
	const totalMinor = toSatang(total);
	const allocated = lines.reduce((s, l) => s + (toSatang(l.amount) ?? 0n), 0n);

	const update = (key: number, patch: Partial<Line>) =>
		setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (inFlight.current) return;
		inFlight.current = true;
		setPending(true);
		setError(undefined);
		try {
			await api.createTransaction({
				form: "PAYMENT",
				primaryAccountId,
				date,
				total: total.trim(),
				memo: memo.trim() || undefined,
				allocations: lines.map((l) => ({
					accountId: l.accountId,
					amount: l.amount.trim(),
				})),
			});
			await onSaved();
		} catch (e) {
			if (e instanceof UncertainOutcome)
				setError(
					"We could not confirm whether this transaction was saved. Check your history before submitting again.",
				);
			else
				setError(
					e instanceof ApiError ? e.message : "Saving failed. Try again.",
				);
		} finally {
			inFlight.current = false;
			setPending(false);
		}
	};

	return (
		<form
			onSubmit={submit}
			aria-labelledby="payment-title"
			className="card wide"
		>
			<h1 id="payment-title">Make a payment or record a charge</h1>
			<label>
				Pay from or charge to
				<select
					value={primaryAccountId}
					onChange={(e) => setPrimary(e.target.value)}
					required
				>
					{primaries.map((a) => (
						<option key={a.id} value={a.id}>
							{a.name} ({TYPE_LABEL[a.type]})
						</option>
					))}
				</select>
			</label>
			<div className="row">
				<label>
					Date
					<input
						type="date"
						value={date}
						max={bangkokToday()}
						onChange={(e) => setDate(e.target.value)}
						required
					/>
				</label>
				<label>
					Total (THB)
					<input
						inputMode="decimal"
						placeholder="0.00"
						value={total}
						onChange={(e) => setTotal(e.target.value)}
						required
					/>
				</label>
			</div>
			<fieldset>
				<legend>Allocation</legend>
				{lines.map((l, i) => (
					<div className="row" key={l.key}>
						<label>
							{`Line ${i + 1} account`}
							<select
								value={l.accountId}
								onChange={(e) => update(l.key, { accountId: e.target.value })}
								required
							>
								<option value="">Choose…</option>
								{lineChoices.map((a) => (
									<option key={a.id} value={a.id}>
										{a.name} ({TYPE_LABEL[a.type]})
									</option>
								))}
							</select>
						</label>
						<label>
							{`Line ${i + 1} amount`}
							<input
								inputMode="decimal"
								placeholder="0.00"
								value={l.amount}
								onChange={(e) => update(l.key, { amount: e.target.value })}
								required
							/>
						</label>
						{lines.length > 1 && (
							<button
								type="button"
								className="secondary"
								aria-label={`Remove line ${i + 1}`}
								onClick={() =>
									setLines((ls) => ls.filter((x) => x.key !== l.key))
								}
							>
								Remove
							</button>
						)}
					</div>
				))}
				<button
					type="button"
					className="secondary"
					onClick={() =>
						setLines((ls) => [
							...ls,
							{ key: nextKey.current++, accountId: "", amount: "" },
						])
					}
				>
					Add line
				</button>
				<p className="muted" aria-live="polite">
					Allocated {money(fromSatang(allocated))} of{" "}
					{totalMinor === null ? "—" : money(fromSatang(totalMinor))}
				</p>
			</fieldset>
			<label>
				Memo (optional)
				<input
					value={memo}
					maxLength={200}
					onChange={(e) => setMemo(e.target.value)}
				/>
			</label>
			{error && (
				<p role="alert" className="error">
					{error}
				</p>
			)}
			<div className="row">
				<button type="submit" disabled={pending}>
					{pending ? "Saving…" : "Save"}
				</button>
				<Link to="/overview">Cancel</Link>
			</div>
		</form>
	);
}
