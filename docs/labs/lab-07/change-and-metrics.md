# Lab 7 change request, metrics and readiness

**Status (28 November 2026): change agreed by Wisit and Natthawat on 28 November 2026 (contract revision 1.4). Implementation implemented on branch `feature/52-payment-limit`, pending review (Issue #52). The red and green test evidence below is actual; staging, release, CI, deployment, UAT and the metrics are not yet measured.** The supplied change announcement says Instructor/TA approval is not required for the change request; both students must agree on a substantive, non-trivial change to behavior already implemented in Sprint 1. It overrides only the handout's Instructor/TA-approval wording (Issue #47, PR #48); the other Lab 7 gates still apply: identified baseline, contract/STS revised and reviewed before code, test-first red/green, regression, review, CI, release and deployment evidence.

## Team decision and impact

### Decision

**Agreed change (D-08):** the owner may set an optional per-transaction **payment limit** on each of their own Loan Taken accounts (a credit card or any other loan they owe); a `PAYMENT` with that primary account whose total exceeds the limit is rejected with `422 PAYMENT_LIMIT_EXCEEDED`. D-08 revises D-03/BR-10 and AC-16. Revision note: the first draft of this change (contract 1.3, PR #53 as opened) proposed a fixed THB 100,000.00 card-charge cap. Wisit's review found it too small and its wording card-specific, so it was withdrawn and replaced by the owner-set limit (contract 1.4). The pushed 1.3 commits remain as history.

| Field | Actual decision / evidence |
| --- | --- |
| Change request and purpose | Let an owner cap a single payment on a Loan Taken account to guard against entry mistakes, with an owner-scoped setter, a stored limit, an enforcement rule and a UI editor. Purpose: optional, owner-controlled risk control; off by default |
| Both students' agreement, rationale and decision date | **AGREED 28 November 2026** by Wisit and Natthawat (contract revision 1.4). Natthawat proposed D-08 the same day; Wisit requested changes on PR #53, the contract was revised, and Wisit then agreed. Rationale: optional, owner-controlled risk control that is substantive but off by default. Implementation: implemented on branch `feature/52-payment-limit`, pending review. Instructor/TA approval is not required (announcement; Issue #47) |
| Existing implemented behavior and accepted version | D-03 / BR-10 / AC-16: every transaction total is between 0.01 and THB 1,000,000,000.00 with at most two decimals; no per-account limit. Accepted Sprint 1 release **`37593da1cb3cd881e6b22845a2b4a929dbf6bc8e`** (release PR #38, deployed as revision `pocket-ledger-00004-hxk`, restarted on 24 November as `pocket-ledger-00005-n78` with the same image). The PD1 release `265c995` has identical application code; later commits on `sprint-1-staging` are documentation only (verified: no difference under `apps/`, `packages/` or `e2e/` between `37593da` and `sprint-1-staging` at `c0a9d1e`) |
| Requested changed behavior | With a limit set on a Loan Taken account: a `PAYMENT` with that primary account and total above the limit is `422 PAYMENT_LIMIT_EXCEEDED` (nothing written); equal is accepted; null (default) is unchanged; Cash `PAYMENT`, `RECEIVE` and repayments into the loan are unaffected. New `PUT /api/accounts/:id/payment-limit`; `paymentLimit` on the account DTO; nullable column and migration `0005_payment_limit.sql`; "Payment limit" editor on Loan Taken cards. Checked after ownership, allocation and type rules and before the D-04 date bounds and the balance check; applies on create only |
| Why this is maintenance rather than an unfinished baseline feature | Sprint 1 already implements and has released payments and charges on Loan Taken accounts and their acceptance (AC-17, TEST-17). The change modifies an accepted rule (D-03 maximum, AC-16) and extends accepted account and transaction behavior. It does not complete any F-01 to F-06 requirement and is not the Sprint 2 account-management scope (Issue #46: create, rename) |
| Why it is substantive | It spans a database migration, a new owner-scoped API with its own validation and error outcomes, a change to the shared account DTO, a UI editor, transaction-rule precedence (limit versus ownership, structural date, D-04 bounds and balance), concurrency with the account row lock, and the ownership and Administrator boundaries on a new endpoint |
| Owner / teammate reviewer | Owner and proposer: Natthawat (assignee of Issue #52). Reviewer and merger: Wisit. Neither student approves or merges their own PR |

### Affected requirement, contract and impact

Contract revision: Sprint 1 contract 1.4 (draft; 1.3 withdrawn); SRS 0.4; System SDS 0.11; STS 0.19; traceability 0.6; feature inventory 0.8; decision register D-08. All dated 28 November 2026 and agreed by both students; no code or test is written until the contract PR is approved and integrated.

| Requirement ID | Feature | SRS / Feature SDS / System SDS sections | AC | STS IDs | Code modules |
| --- | --- | --- | --- | --- | --- |
| BR-14 (new), BR-10 (revised), FR-05 | F-05 Payment or charge | SRS BR-10, BR-14, FR-05; contract "Owner-set payment limit" (check order, enforcement); System SDS "Owner-set payment limit" and the `POST /api/transactions` row | AC-32, AC-33 | TEST-29 (API, planned) | `apps/server/src/finance.ts` (`saveTransaction`: one new check using the locked primary row's limit and a new `Rejection`) |
| FR-03, BR-14 | F-03 Accounts | SRS FR-03, BR-14; contract "Setting the limit"; System SDS API table (new PUT row) and data model | AC-29, AC-30, AC-31 | TEST-31 (API, planned) | `apps/server/src/finance.ts` (new `PUT /api/accounts/:id/payment-limit`, `accountDtos`), reuse of `parseAmount` from `money.ts` (unchanged) |
| FR-03/05 (browser) | F-03, F-05 UI | System SDS "UI structure" (revision 0.11 note); contract UI bullet | AC-34 | TEST-30 (E2E, planned) | `apps/web/src/api.ts` (`Account.paymentLimit`, `updatePaymentLimit`), `apps/web/src/finance-pages.tsx` (new editor and display on Loan Taken cards); the payment form's existing alert shows the 422 |
| Callers and dependencies | F-03, F-05, F-06; later F-07/F-08 | Account DTO is built by one function (`accountDtos`) and returned by `GET /api/accounts`, `GET /api/accounts/:id`, `GET /api/summary` (`accounts`) and the new PUT; consumers are the web `Account` type, `scripts/live-check.ts` and tests. `saveTransaction` is called only by `POST /api/transactions`. F-07 correction and F-08 duplicate decide in their own contracts whether to apply the limit | AC-29 to AC-34 | TEST-09, TEST-10, TEST-12, TEST-22, TEST-26 as regression | `apps/server/src/finance.ts`, `apps/web/src/api.ts`, `apps/web/src/finance-pages.tsx` |
| UI / API validation | F-03, F-05 | Setter: body validation `400 INVALID_INPUT` (`field: "paymentLimit"`), then `404`, then `422 RULE_VIOLATION` for a non-Loan-Taken account (matches the opening-balance endpoint convention). Transactions: structural parse (400, including date shape) unchanged and first; the limit (422) is a domain rule before the D-04 bounds | AC-30, AC-32 | TEST-29 g/j, TEST-31 c/d | `apps/server/src/finance.ts` |
| Roles and ownership | F-01, F-03 | New endpoint: anonymous 401, Administrator 403, foreign/unknown/non-UUID 404 with no disclosure, Origin guard as for every PUT; payments: ownership 404 before the limit; a limit never applies across accounts or Users | AC-31, AC-32 | TEST-31 e, TEST-29 h1/h2/f; TEST-08, TEST-12, TEST-21 as regression | `requireUser` and owner-scoped lookups in `finance.ts`, same pattern |
| Persistence | F-03 | Nullable `accounts.payment_limit_satang bigint`, `CHECK (NULL or 1..100000000000)` named `accounts_payment_limit_range`; "Loan Taken only" is application-enforced because a per-row CHECK cannot depend on another column's enum without a trigger; stored as integer satang like every amount | AC-29, AC-30 | TEST-31 g (stored value and CHECK) | `packages/db/src/schema/accounts.ts`, migration `0005_payment_limit.sql`, `meta/_journal.json`, `meta/0005_snapshot.json` |
| Concurrency | F-03, F-05 | The limit is read from the primary account row that `saveTransaction` already locks `FOR UPDATE` in the same database transaction; the setter locks the same row, so a concurrent limit update and payment are serialized. No deterministic concurrency test is planned (it would be timing-dependent); the argument rests on the existing lock, as for the opening-balance update | AC-32 | none beyond TEST-29 | `apps/server/src/finance.ts` |
| Historical data | F-05, F-06 | Saved transactions are not re-validated or modified; lowering a limit below past payments is allowed and leaves history and balances unchanged. Every existing account gets `NULL`, so no existing record changes behavior | AC-29, AC-32 | TEST-29 i; TEST-22, TEST-23, TEST-26 as regression | none |
| Migration | Data model | **Required (not N/A).** One additive migration adds a nullable column with no default and a CHECK. It is backward compatible: old application code ignores the column, so an image rollback does not need a schema rollback, and no row is rewritten. It must pass TEST-27 on a clean database and run on the deployed database through the existing reviewed migration job. No database is changed in this documentation step; the exact deployment command is presented for the student's review under the Lab 5/7 rules, never run autonomously | AC-29, AC-30 | TEST-27, TEST-31 g | `packages/db/src/schema/accounts.ts`, `packages/db/src/migrations/` |
| Configuration and deployment | Delivery | No new environment variable, secret or infrastructure; normal reviewed staging-to-main release, existing smoke and C-05 checks, plus a post-deploy read of one account to confirm the new DTO field | none | TEST-27 | none |

### Behavior that must remain unchanged and the regression tests that protect it

The existing tests below must pass with **no change to any expected value**. TEST-29, TEST-30 and TEST-31 add behavior and do not edit or weaken an existing test. Existing account-DTO assertions were reviewed: they compare API responses to API responses or use `toMatchObject`, so the new `paymentLimit` field requires no edit (details in the STS); a literal-DTO failure found during implementation would be listed as a legitimately revised expected result in the change PR.

| Unchanged behavior | Protecting tests (existing) |
| --- | --- |
| Loan Taken charge 1,200.00 split 700/500, debt and Expense effects; repayment from the bank; independent fixture totals (bank 29,500; debt 700; Income 20,000; Expense 1,200); a Loan Taken account with no limit behaves exactly as before | TEST-17, TEST-18, TEST-22 (`transactions.api.test.ts`, `summary.api.test.ts`, `money.unit.test.ts`, `money-journey.spec.ts`) |
| Amount parsing and range: more than two decimals, zero, negative, above 1,000,000,000.00 are `400 INVALID_INPUT` | TEST-16 (`money.unit.test.ts`, `transactions.api.test.ts`) |
| Allocation sum, type compatibility, no negative balance, no overpayment; atomic rejection | TEST-14, TEST-15, TEST-19, TEST-20 |
| Salary `RECEIVE` and D-04 date rules | TEST-13, TEST-24 |
| Account list/detail, opening-balance update, ownership, Administrator denial | TEST-10, TEST-12 (`accounts.api.test.ts`), TEST-08, TEST-21 (`ownership.api.test.ts`) |
| Seed idempotence (a rerun never overwrites accounts) | TEST-09 |
| History, summary, persistence across restart | TEST-11, TEST-23, TEST-26 |
| Accounts screen layout and keyboard use at 390, 768 and 1280 px, which the new editor could disturb | TEST-25 |
| Single submission and no automatic retry | TEST-28 |
| Clean migrate (now through `0005`), seed, build and the full suites | TEST-27 |

Pre-change baseline measurement of those suites: the TEST-27 result on release `265c995` (131 server tests, 13 E2E tests; application code identical to `37593da`) is recorded in `docs/sprints/sprint-1/tests.md`; `37593da` itself was verified by main CI run 44885832238 and Lab 5 C-05. Re-run the full suites on the exact Lab 7 commits before recording any new count.

### Overlap with Issue #46 (Sprint 2 F-03 account management) and PR #48

Issue #46 covers account create, list/detail and rename. D-08 adds one nullable account column, one `PUT` endpoint, one DTO field and one editor on existing Loan Taken cards, and nothing else about account management: no create, rename, delete or archive. They are separate scopes, but they touch the same files, so the sequencing matters: both would change `accounts` schema, `accountDtos` and the account route area of `finance.ts`, the accounts screen, and each would want the next migration number (`0005`). Whichever is implemented second must take the next free migration number and journal index and rebase its DTO tests on the other's fields; the #46 contract must cite D-08's `paymentLimit` field and the PUT. #46 requires accepted D-03 rules to stay intact; D-08 is an explicit, dated, agreed revision of D-03, not a silent one. No D-08 behavior is claimed for an account created through #46: a newly created Loan Taken account has a null limit.

PR #48 (Issue #47) also edited this file. It merged into `sprint-1-staging` on 28 November 2026, and `sprint-1-staging` was then merged into this branch. The conflict was resolved by keeping the filled D-08 tables above and the announcement-precedence and grading-access section from PR #48 below.

## Announcement precedence and access for grading

- The spec-sheet announcement overrides only the handout's Instructor/TA-approval step. It does not waive the Sprint 1 baseline, impact analysis, teammate contract review, test-first evidence, regression, release or readiness requirements.
- Use synthetic test data. Supply safe test-account credentials through the private course handoff only; never place real passwords, tokens or production secrets in Git or the PDF.
- Keep the assessed deployment and public repository available throughout grading.

## Red / green, regression and delivery

| Step | Command / file / test or PR | Version | Actual result / evidence |
| --- | --- | --- | --- |
| Changed-behavior test before implementation | `bun test apps/server/tests/transactions.api.test.ts -t "TEST-29"`, `bun test apps/server/tests/accounts.api.test.ts -t "TEST-31"`, `bun test apps/server`, `bun run build:web && bun run test:e2e` on the test-only commit (no scaffold; Bun 1.4.5, `postgres:18.4`, local, 28 Nov 2026) | `cf24c9a` (application code identical to `37593da`) | **RED, as intended.** TEST-29: 2 pass (guards d1, h1) / 11 fail, `Expected: 200, Received: 404`. TEST-31: 0 pass / 7 fail (404 from the missing route, `Received: undefined` for the missing DTO field, missing column). Full server suite 133 pass / 18 fail; E2E 13 pass / 1 fail (TEST-30: heading "Payment limit" `Expected: 1, Received: 0`). Types, Biome and web build passed, so this is not an environment failure |
| Implementation and intended test passing | Same commands, plus a mutation run with only the limit check disabled | `3284bf7` (server, schema, migration `0005_payment_limit`), `e6ee2e7` (UI) on branch `feature/52-payment-limit`, pending review | **GREEN.** TEST-29 13/0, TEST-31 7/0. Mutation: TEST-29 8 pass / 5 fail (cases b, c, g, i, k; `Expected: 422`, `Received: 201`), reverted, not committed |
| Relevant integration / full regression | `bun test apps/server`; `bun run test:e2e`; `bun run check-types`; `bunx biome check apps packages scripts e2e playwright.config.ts`; `bun run build:web`; clean `db:migrate` and `db:seed` with a seed rerun on a fresh disposable database | `e6ee2e7`, local | **PASS locally.** Server 151 pass / 0 fail / 0 skip, 739 assertions; E2E 14 passed / 0 failed; types and Biome clean; seed rerun inserted 0 and kept a set limit. Local only; CI run PENDING |
| Teammate-reviewed staging integration | | | PENDING |
| Reviewed main release / CI / deployment | | | PENDING (CI, release PR, deployment) |
| Affected independent UAT re-test, where applicable | | | PENDING |

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
| Behavior and tests | Team-agreed changed behavior and regression remain correct | |
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
