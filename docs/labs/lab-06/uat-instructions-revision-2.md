# PocketLedger Sprint 1 UAT instructions: revision 2 addendum

**Status: proposed revision, 27 November 2026.** It takes effect only after teammate review of this pull request (#49) and agreement by the Pockit UAT Team. It does not change the plan already handed over.

## Relation to the handed-over plan

- The plan handed to Pockit on 23 November 2026 stays unchanged in [`uat-instructions.md`](uat-instructions.md) (Git blob `ec167cd4b9f2b5014629b81f79a839f06fccf799`, identical to the partner copy). Pockit's run of 23–25 November used that plan.
- This addendum changes only the steps listed below. Every other case, step, expected result and rule in the handed-over plan still applies.
- Case IDs do not change. UAT-01 to UAT-10 keep their numbers and meanings, so the existing partner results still map one-to-one.

## Changes

The write attempts in the two access cases are removed. The cases still cover what Lab 6 §3.1 requires: a forbidden role/ownership case that covers another user's records and the Administrator's denial of financial data.

| Case | Step in the handed-over plan | Change in revision 2 |
| --- | --- | --- |
| UAT-04 | 4 (B1 writes A1's opening balance) | Removed |
| UAT-04 | 5 (B1 creates a payment against A1's Dining account) | Removed |
| UAT-04 | 6, 7 (both users unchanged) | Kept. They now confirm that B1's read attempts left both users' data unchanged. "No 10.00 appears" no longer applies. |
| UAT-04 | 1–3, 8 (cross-user reads, signed-out summary) | Unchanged. Step 3 (`/api/accounts/A_BANK_ID` returns 404 with no private data) is still required. |
| UAT-05 | 5 (Administrator write attempts) | Removed |
| UAT-05 | 7 (A1 unchanged) | Kept. It now confirms that the Administrator session changed nothing. |
| UAT-05 | 1–4, 6, 8 (Administrator UI and API denials, User denied administration) | Unchanged |

Pass criteria after revision 2:

- **UAT-04:** every cross-user read is refused with the same not-found answer, exposes no private value, and leaves both users' data unchanged.
- **UAT-05:** the Administrator never sees financial data or summaries, and a User cannot reach administration.

## Coverage effect

The removed steps exercised server-side refusal of cross-user and Administrator **writes** (AC-12 and AC-15 foreign references for writes; AC-08 and AC-21 for Administrator writes). After revision 2, that refusal is evidenced by developer tests only, not by independent UAT. Report this as a limitation. Do not report the removed steps as executed or passed.

## Re-test needed under revision 2

The partner record marks UAT-04 and UAT-05 as Partial. Under revision 2:

- **UAT-04:** step 3 has no recorded result, so it still needs to be run (as B1, open `<URL>/api/accounts/A_BANK_ID`; expected 404 `NOT_FOUND` with no private data). Steps 6–7 must also be recorded against the before-snapshot.
- **UAT-05:** the remaining steps are covered by the partner's recorded read-denial evidence, subject to the UAT Team's own judgement.

The UAT Team records the outcome and its decision in its own report. The Product Team does not record or change those results.
