# Lab 7 approved change, metrics and readiness

**Status (28 November 2026): change selected and contract revision drafted; awaiting teammate review. No test or code is written; no metric below is measured.** The change announcement supplied by the student overrides only the handout's Instructor/TA-approval wording (Issue #47); the other Lab 7 gates still apply: identified baseline, contract/STS revised and reviewed before code, test-first red/green, regression, review, CI, release and deployment evidence.

## Team decision and impact

### Decision

Both students select this substantive change to behavior implemented in Sprint 1: **cap a single credit-card charge at THB 100,000.00** (decision D-08, which revises D-03 for card charges only).

| Field | Actual decision / evidence |
| --- | --- |
| Change request and purpose | Reject a card charge (a `PAYMENT` whose primary account is Loan Taken) with a total above THB 100,000.00 using `422 PAYMENT_LIMIT_EXCEEDED`. Purpose: risk control. A purchase that large is more likely to be an entry error, so it must be split or paid by another form. A fixed cap, not a user-set limit, was chosen to keep the change small and to avoid overlapping the Sprint 2 account-management contract (Issue #46) |
| Existing implemented behavior and accepted version | D-03 / BR-10 / AC-16: any transaction total is greater than 0 and at most THB 1,000,000,000.00; no limit specific to card charges. Accepted Sprint 1 release **`37593da1cb3cd881e6b22845a2b4a929dbf6bc8e`** (release PR #38, deployed as revision `pocket-ledger-00004-hxk`). The PD1 release `265c995` has identical application code; later commits on `sprint-1-staging` are documentation only (verified: no difference under `apps/`, `packages/` or `e2e/` between `37593da` and `sprint-1-staging` at `c0a9d1e`) |
| Requested changed behavior | Card charge total greater than 100,000.00 is rejected (`422 PAYMENT_LIMIT_EXCEEDED`, nothing written); exactly 100,000.00 is accepted; Cash `PAYMENT` and `RECEIVE` are unchanged; the check follows authentication, ownership and form/type checks and precedes the balance check; create only |
| Why this is maintenance rather than an unfinished baseline feature | Sprint 1 already implements card charges and their acceptance (AC-17, TEST-17, released and deployed). The change modifies an accepted, working rule (D-03 maximum, AC-16). It does not complete any F-01 to F-06 requirement and is not part of Sprint 2 or Sprint 3 scope |
| Instructor/TA approval, date and reference | Not required for this change, per the change announcement supplied by the student and Issue #47. Agreement is between the two students: Natthawat proposed D-08 on 28 November 2026; Wisit's agreement: [date to be recorded after his review of the contract revision] |
| Owner / teammate reviewer | Owner and reviewer to be assigned in the change Issue (Natthawat proposed; Wisit as the specific reviewer who also merges). Neither student approves or merges their own PR |

### Affected requirement, contract and impact

Contract revision: Sprint 1 contract 1.3 (draft); SRS 0.4; System SDS 0.11; STS 0.19; traceability 0.6; feature inventory 0.8; decision register D-08. All dated 28 November 2026 and pending teammate review before any code.

| Requirement ID | Feature | SRS / Feature SDS / System SDS sections | AC | STS IDs | Code modules |
| --- | --- | --- | --- | --- | --- |
| BR-14 (new), BR-10 (revised), FR-05 | F-05 Payment or charge | SRS BR-10, BR-14, FR-05; Sprint 1 contract "Card-charge cap (Lab 7 revision 1.3)"; System SDS "Card-charge cap (D-08)" and the `POST /api/transactions` row | AC-29, AC-30, AC-31, AC-32 | TEST-29 (API, planned) | `apps/server/src/finance.ts` (`saveTransaction`: one new check and one constant); `apps/server/src/money.ts` only if the constant is exported there; `parseAmount` unchanged |
| BR-10, FR-05 (browser behavior) | F-05 UI | System SDS "UI structure" (Revision 0.11 note) | AC-33 | TEST-30 (E2E, planned) | `apps/web/src/finance.tsx` (existing `role="alert"` already shows the server message; optional hint under Total); no API client change expected |
| Callers and dependencies | F-05, F-06, later F-07/F-08 | `saveTransaction` is called only by `POST /api/transactions`. Its callers are the web payment form (`api.createTransaction`), `scripts/live-check.ts` (1,200.00 card charge, below the cap) and the API/E2E tests. F-06 reads (history, summary, balances) read saved rows and are unaffected. Forward dependency: Sprint 2 correction (F-07) and Sprint 3 duplicate (F-08) must apply the same cap when they create or change a card charge (stated in D-08) | AC-29 to AC-33 | TEST-13 to TEST-24, TEST-26, TEST-28 as regression | `apps/server/src/finance.ts`; future F-07/F-08 contracts |
| UI / API validation | F-05 | Parse-stage validation (400) is unchanged and runs first; the cap is a domain rule (422) after ownership and type checks and before date and balance rules | AC-30, AC-31 | TEST-29b to TEST-29g | `apps/server/src/finance.ts` |
| Roles and ownership | F-01, F-05 | Unchanged: anonymous 401, Administrator 403, foreign or unknown account 404 evaluated before the cap, so the cap reveals nothing about foreign accounts | AC-32 | TEST-29h/i; TEST-21, TEST-08, TEST-12 as regression | `requireUser` and the owner-scoped lock query in `finance.ts`, unchanged |
| Persistence | F-05 | No new field or DTO change. Rejection happens inside the existing database transaction before any insert, so nothing is written (the existing atomicity design, BR-07) | AC-30 | TEST-29b to d (counts and fresh reads); TEST-20 as regression | `finance.ts`; schema unchanged |
| Historical data | F-05, F-06 | Saved transactions are not re-validated or modified. Any earlier card charge above 100,000.00 would stay readable and keep its effect on derived balances; opening-balance updates do not re-check it. Whether any such row exists in the deployed database was not queried (no database was touched in this documentation step) | AC-30, AC-31 | TEST-22, TEST-23, TEST-26 as regression | none |
| Migration | Data model | **N/A.** The cap is a fixed constant in application code. It adds no column, constraint or default, and rewrites no row. The database `transactions_total_max` CHECK stays at 1e11 satang because Cash payments and receipts still allow THB 1,000,000,000.00, and a per-row CHECK cannot depend on the primary account's type without a cross-table rule. Existing `0000` to `0004` migrations remain current | none | TEST-27 (clean migrate and seed) as regression | none |
| Configuration and deployment | Delivery | No new environment variable, secret or infrastructure. Deployment follows the normal reviewed staging-to-main release and the existing smoke/C-05 checks | none | TEST-27 | none |

### Behavior that must remain unchanged and the regression tests that protect it

The existing tests below must pass with **no change to any expected value**. The planned TEST-29/30 add behavior; they do not edit or weaken an existing test.

| Unchanged behavior | Protecting tests (existing) |
| --- | --- |
| Card charge 1,200.00 split 700/500: debt and Expense effects; repayment from the bank; independent fixture totals (bank 29,500; debt 700; Income 20,000; Expense 1,200) | TEST-17, TEST-18, TEST-22 (`transactions.api.test.ts`, `summary.api.test.ts`, `money.unit.test.ts`, `money-journey.spec.ts`) |
| Amount parsing and range: more than two decimals, zero, negative, above 1,000,000,000.00 are `400 INVALID_INPUT`; 1,000,000,000.00 is the exact general maximum | TEST-16 (`money.unit.test.ts`, `transactions.api.test.ts`) |
| Allocation sum, type compatibility, no negative balance (`INSUFFICIENT_BALANCE`), no overpayment | TEST-14, TEST-15, TEST-19 |
| Atomic rejection and rollback | TEST-20 (`transactions.atomicity.test.ts`), TEST-19 |
| Salary `RECEIVE` and date rules | TEST-13, TEST-24 |
| Ownership, Administrator denial, safe 404 | TEST-08, TEST-12, TEST-21 |
| History, summary, persistence across restart | TEST-23, TEST-11, TEST-26 |
| Single submission and no automatic retry in the browser | TEST-28 |
| Clean setup, migrate, seed, build and full suites | TEST-27 |

Pre-change baseline measurement of those suites: the TEST-27 result on release `265c995` (131 server tests, 13 E2E tests; application code identical to `37593da`) is recorded in `docs/sprints/sprint-1/tests.md`; `37593da` itself was verified by main CI run 44885832238 and Lab 5 C-05. Re-run the full suites on the exact Lab 7 commits before recording any new count.

### Overlap with Issue #46 (Sprint 2 F-03 account management)

Issue #46 covers account create, list/detail and rename, with name rules and persistence. D-08 touches no account field, endpoint or screen and adds no migration, so the two do not share a contract section or a code path (#46 changes account routes and the accounts schema; D-08 changes only `saveTransaction`). #46 states that accepted D-03 rules must stay intact and that it excludes Lab 7 behavior; D-08 is an explicit, dated revision of D-03 for card charges, not a silent one. The only shared documents are the register, SRS, System SDS and traceability; the #46 contract must cite D-08 when it describes transaction validation. A user-configurable per-card limit would need a new endpoint, a migration and account editing, so it is recorded as backlog and left to a possible Sprint 2 decision with #46.

## Red / green, regression and delivery

| Step | Command / file / test or PR | Version | Actual result / evidence |
| --- | --- | --- | --- |
| Changed-behavior test before implementation | PLANNED, NOT RUN: `bun test apps/server/tests/transactions.api.test.ts -t "TEST-29"`, expected failures b, c, d (`Expected: 422, Received: 201`; case d wrong code); E2E TEST-30 step in `e2e/sprint-1/money-journey.spec.ts` | To be recorded on the test-only commit | Blank until run |
| Implementation and intended test passing | | | |
| Relevant integration / full regression | | | |
| Teammate-reviewed staging integration | | | |
| Reviewed main release / CI / deployment | | | |
| Affected independent UAT re-test, where applicable | | | |

The red test must fail for the intended changed behavior, not a broken environment. Do not weaken unrelated requirements to make the change pass.

## Five dated metrics

Use the actual repository, test output and workflow history retained since Lab 5. State the date/time and window; leave values blank until measured.

| Metric | Window / snapshot time | Source / query / run | Actual value | Scope / interpretation caveat |
| --- | --- | --- | --- | --- |
| Completed Issues | | | | |
| Merged PRs | | | | |
| Passing automated/regression tests | | | | |
| UAT defects opened / resolved | | | | |
| Successful / failed CI runs | | | | |

**Action-oriented interpretation (maximum 100 words):** fill after measuring. Counts alone are not evidence of engineering quality.

## Release readiness

| Area | Required check | Actual status / version / evidence |
| --- | --- | --- |
| Behavior and tests | Approved changed behavior and regression remain correct | |
| Defects / independent re-tests | Accepted findings resolved or clearly disclosed | |
| Technical debt / required unfinished work | Distinguish a compromise from a missing required feature | |
| Configuration / data | Safe env, migration compatibility and durable data | |
| Documents / release | Current contract/setup, reviewed version and identifiable deployment | |

## Short retrospective

| Question | One or two evidence-based sentences |
| --- | --- |
| What helped? | |
| What hurt? | |
| What will change next? | |
