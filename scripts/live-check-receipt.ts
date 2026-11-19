/**
 * Durable receipt for the synthetic production record created by `scripts/live-check.ts record`.
 *
 * The receipt is written before the transaction is submitted, so a run that fails or loses the
 * response after the server committed the charge never lets a retry create a second charge.
 *
 *   pending     written before the POST; the outcome is not known yet (the memo identifies it)
 *   incomplete  the POST returned 201; the transaction id is known, later checks did not all pass
 *   complete    every record check passed; this is the C-05 baseline used by `verify`
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type ReceiptStatus = "pending" | "incomplete" | "complete";

export type Receipt = {
	status: ReceiptStatus;
	memo: string;
	startedAt: string;
	id?: string;
	health?: unknown;
	detail?: unknown;
	summary?: unknown;
	recordedAt?: string;
	/** Set when a pending/incomplete receipt was completed by `reconcile`, not by `record`. */
	reconciled?: boolean;
};

export const receiptPath = (dir: string) => join(dir, "c05-record.json");

/** Atomic replace: a crash never leaves a half-written receipt. */
export function writeReceipt(file: string, receipt: Receipt) {
	const tmp = `${file}.tmp`;
	writeFileSync(tmp, `${JSON.stringify(receipt, null, 2)}\n`);
	renameSync(tmp, file);
}

/**
 * Reads the receipt. A baseline written before receipts had a status (it was written only
 * after every check passed and carries `detail` and `summary`) is read as complete.
 */
export function readReceipt(file: string): Receipt | undefined {
	if (!existsSync(file)) return undefined;
	const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<Receipt> & {
		memo?: string;
	};
	if (!raw.status) {
		if (!raw.id || !raw.memo || !raw.detail || !raw.summary)
			throw new Error(`${file} is not a recognisable receipt`);
		return {
			...raw,
			status: "complete",
			memo: raw.memo,
			startedAt: raw.recordedAt ?? "",
		};
	}
	if (!raw.memo || !raw.startedAt)
		throw new Error(`${file} is missing memo/startedAt`);
	return raw as Receipt;
}

/** `record` never creates a transaction while any receipt exists. */
export function assertCanRecord(file: string, receipt: Receipt | undefined) {
	if (!receipt) return;
	if (receipt.status === "complete")
		throw new Error(
			`${file} is a complete C-05 baseline (transaction ${receipt.id}); it is not overwritten and no new transaction is created`,
		);
	throw new Error(
		`${file} is ${receipt.status}: a synthetic transaction may already exist (memo "${receipt.memo}"${receipt.id ? `, id ${receipt.id}` : ""}). No new transaction was created. Run \`reconcile\` with the same directory to resolve it.`,
	);
}

/** `verify` compares only against a complete baseline. */
export function requireComplete(file: string, receipt: Receipt | undefined) {
	if (!receipt) throw new Error(`${file} does not exist; run \`record\` first`);
	if (receipt.status !== "complete" || !receipt.detail || !receipt.summary)
		throw new Error(
			`${file} is ${receipt.status}, not a complete baseline; run \`reconcile\` first`,
		);
	return receipt as Receipt & { id: string; detail: unknown; summary: unknown };
}
