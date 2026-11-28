# System-Level Software Design Specification

Draft 0.11, updated 28 November 2026. Revision 0.11 (Lab 7, D-08, draft pending teammate review) adds a fixed card-charge cap to the money rules, the `POST /api/transactions` contract and the error list; no data-model or migration change. The text below is otherwise the draft 0.10 baseline. Draft 0.10 summary: Better T Stack and first-party stateless JWT for Sprint 1 seeded-user authentication are selected. Both students accepted D-01 to D-07 through PR #15 at `98afb3b`. The F-01–F-06 Sprint 1 increment is integrated into `sprint-1-staging` at `53c20ff`; PR #25 was approved by N0TAW00D, and CI #59 passed on its head `420c6bd`. Clean-checkout TEST-27 also passed on `53c20ff`. These checks are staging evidence, not an accepted release. The team is in Section 1 (regular program). PR #24, which proposed an Origin/CSRF policy, was closed unmerged; the policy remains deferred and is disclosed as a known limitation of the current public deployment. The accepted Sprint 1 release on `main` is `265c995` (release PR #32; see `docs/releases.md`), and release-matched TEST-27 passed on it. Release PR #38 then advanced `main` to `37593da`, which deploys the same application code with only a TEST-28 test fix and documentation (`docs/releases.md`). The PD1 submission remains outstanding. The SRS defines required product behavior.

## Architecture and responsibilities

Use a modular monolith with three logical layers. The team selected Better T Stack configured with TanStack Router for the frontend, Elysia for the backend, Bun as runtime and package manager, PostgreSQL with Drizzle ORM, Docker for local database setup and web/server deployment packaging, and Biome, Husky and Turborepo add-ons. Better Auth was part of the initial preset choice; for Sprint 1 seeded-user authentication, the team selected first-party stateless JWT instead. API add-ons, payments and examples are disabled. D-02 records the selected stack and current pin locations: Bun 1.4.4 in package metadata and CI, and PostgreSQL 18.4 in the CI service and `scripts/test-db.sh`. The `oven/bun:1.4.4` base image and deployment image configuration remain Lab 5 targets; feature-level behavior is specified and reviewed with each implementation PR. The staging candidate implements the Sprint 1 browser UI, Elysia API, Drizzle persistence and PostgreSQL data path for F-01–F-06; integration and clean-checkout results are recorded in the STS. Three logical layers do not require three servers or microservices.

```text
TanStack Router browser UI
  -> Elysia HTTP API
     -> identity / administration / financial application services
        -> exact money rules and ownership checks
           -> Drizzle ORM -> PostgreSQL
```

The browser owns input presentation and feedback. The Elysia application verifies the signed JWT, enforces product permissions and ownership, validates the complete transaction and controls the database transaction through Drizzle. PostgreSQL persists users, financial accounts, transactions and allocation lines. Client-supplied owner or role values never establish authority. The implemented token uses `sub`, `displayName`, `role`, `iss`, `aud`, `iat` and `exp`; D-05 sets a 3600-second lifetime, HS256 signing with `jose`, issuer `pocket-ledger` and audience `pocket-ledger-web`. The exact verification behavior is covered by the F-01 contract and the results recorded in the STS.

Balances are derived from opening balances and persisted transaction/allocation effects rather than maintained in a second mutable balance cache. A query uses the agreed D-03 sign rules. Test expected values must be independently calculated. If a later design chooses a cache or a different persistence model, document its atomicity and reconciliation before implementation.

## Major data model

| Entity | Main fields and relationships | Constraints and lifecycle |
| --- | --- | --- |
| UserAccount | id, email, displayName, passwordHash, role, enabled, timestamps | Unique normalized identity; User or Administrator; no plaintext password |
| JWT credential | sub, displayName, role, iss, aud, iat, exp claims | Signed, not encrypted; held in an HttpOnly cookie and not persisted as a server-side session; existing claims remain effective until expiry while the signing key is accepted |
| FinancialAccount | id, ownerId, name, type, currency, openingAmountMinor, openingDate | Five required types; owner is a User; opening policy D-03/D-04 |
| FinancialTransaction | id, ownerId, form, primaryAccountId, date, totalMinor, memo, createdAt | Positive exact total under D-03; supported form; primary account owned by same User; revision 0.11: no new field. The card-charge cap (D-08) is enforced in application code, and the database total CHECK (at most 1e11 satang) is unchanged because Cash payments and receipts still allow it |
| AllocationLine | id, transactionId, accountId, amountMinor, position | Positive exact amount; all accounts owned by transaction owner; sum equals total |
| Favourite / correction records | Future contract fields | Allocate in S2/S3; no unreviewed schema or implemented behavior claimed |

Use foreign keys and, where supported, owner/account composite references so cross-owner links cannot be introduced accidentally. A cross-row sum is validated inside the application/database transaction; do not claim that a simple per-row CHECK proves the allocation total. Record a migration and safe seed procedure with the first implementation. Re-running seed must preserve existing financial activity.

## Money representation and effect matrix

Agreed D-03 in PR #15 specifies THB with two decimal places, amounts greater than 0 and at most 1,000,000,000.00, parsed exactly into integer satang (`bigint`); do not use binary floating-point arithmetic. Opening balances are at least 0, and a transaction that would make a Cash, Loan Taken or Loan Given balance negative is rejected atomically (D-03, D-04). The two transaction forms are `PAYMENT` ("Make a payment or record a charge") and `RECEIVE` ("Receive money"). A `PAYMENT` whose primary account is Cash is a payment; one whose primary account is Loan Taken (for example a credit card) is a charge. `RECEIVE` requires a Cash primary account. The following normal-balance convention defines each effect's sign.

| Form / side | Account type | Change to its normal balance |
| --- | --- | --- |
| PAYMENT primary (payment) | Cash | Minus transaction total |
| PAYMENT primary (charge) | Loan Taken | Plus transaction total (debt grows) |
| Payment allocation | Expense | Plus allocation (expense grows) |
| Payment allocation | Loan Taken | Minus allocation (debt repayment) |
| Payment allocation | Loan Given | Plus allocation (receivable grows) |
| Payment allocation | Cash | Plus allocation (transfer received) |
| Receive primary | Cash | Plus transaction total |
| Receive allocation | Income | Plus allocation (income grows) |
| Receive allocation | Loan Given | Minus allocation (repayment received) |
| Receive allocation | Loan Taken | Plus allocation (new borrowing) |
| Receive allocation | Cash | Minus allocation (transfer sent) |

Income/expense summaries include only their relevant classification effects within the inclusive Asia/Bangkok calendar-date range agreed in D-04. Opening balances, transfers, borrowing and debt repayments are excluded. A transaction date must be on or after the opening date of its primary account and every referenced balance-bearing account (Cash, Loan Taken or Loan Given), and no later than today. Income/Expense classification accounts do not impose an opening-date cutoff. An opening balance/date can be revised after activity only if no resulting balance is negative and no existing transaction falls before the revised opening date; the change recalculates derived history and creates no separate audit event in Sprint 1. The PAYMENT allocation rows apply to both a Cash and a Loan Taken primary account; for example, a card charge allocates to Expense, and a bank-to-card repayment is a PAYMENT from Cash allocated to the card (Loan Taken). Allocation rules (D-03): at least one line; each line references a different owned account; no line references the primary account; mixed lines of different allowed types in one transaction are allowed (for example Expense plus Loan Taken repayment); any other form/type combination, including an Income or Expense primary account, is rejected. Sprint 1 tests the salary, card-charge and repayment combinations; Sprint 2 completes tests for the remaining allowed combinations.

### Card-charge cap (D-08, revision 0.11)

A card charge is a `PAYMENT` whose primary account is Loan Taken. Its total must be at most THB 100,000.00 (`MAX_CARD_CHARGE_SATANG` = 10,000,000n, a fixed constant in the server's finance module; there is no per-account value). A larger total is rejected with `422 PAYMENT_LIMIT_EXCEEDED` and the whole request writes nothing. The cap compares the already-parsed exact satang total, so 100,000.00 is accepted and 100,000.01 is rejected. It does not apply to a `PAYMENT` from a Cash primary account or to any `RECEIVE`; those keep the D-03 maximum of 1,000,000,000.00. The general amount parser, the 400 `INVALID_INPUT` outcomes and the effect matrix above are unchanged. Applied only when a transaction is created; existing rows are not re-validated.

Validation order inside `saveTransaction` (new step marked): structural validation of the body (400, before the transaction); owner-scoped, locked account lookup (404 for a foreign or unknown ID); distinct-line and primary-line check (`INVALID_ALLOCATION`); allocation sum (`ALLOCATION_MISMATCH`); primary and allocation type checks (`INCOMPATIBLE_ACCOUNT`); **card cap (`PAYMENT_LIMIT_EXCEEDED`, new)**; date checks (`INVALID_DATE`); balance check (`INSUFFICIENT_BALANCE`). Authentication (401) and the Administrator role check (403) precede all of these. Because the cap precedes the balance check, an over-limit card charge never reports `INSUFFICIENT_BALANCE`.

## Role and ownership matrix

| Operation | User | Administrator / anonymous |
| --- | --- | --- |
| Login / current identity / logout | Own credential | Administrator uses own session; anonymous cannot read a protected identity |
| List platform identities; enable/disable | Forbidden | Administrator only, subject to agreed safeguards |
| Financial account, opening balance and transaction read/write | Own records and owned allocation references only | Forbidden for Administrator; anonymous unauthenticated |
| Balances, summaries, history and later favourites/duplicates | Own data only | Forbidden for Administrator; anonymous unauthenticated |

Agreed baseline error precedence: establish authentication; enforce role; validate structural input; resolve the resource inside the caller's ownership scope; apply domain validation; persist atomically. An out-of-scope resource returns a safe not-found response; it must not disclose another user's name, amount or existence. List/summary queries are scoped before aggregation, not filtered after calculating global totals.

## Authentication and configuration

D-05 records the selected first-party stateless signed JWT in an HttpOnly cookie for Sprint 1 seeded-user authentication. The approved lifetime is 3600 seconds, signed with HS256 using `jose`. Logout clears the browser cookie but cannot revoke a copied token before expiry while its signing key remains accepted; role changes and account disable likewise do not affect an existing token until expiry. Retiring a signing key can invalidate outstanding tokens earlier. Validate signature, fixed algorithm, issuer, audience and expiry. Use HttpOnly, SameSite=Lax and Secure under HTTPS. The current implementation reads the key from `JWT_SECRET`. Wisit accepted keeping a cryptographically random key of at least 32 bytes in an ignored local `.env` or deployment secret store, rotating manually by replacing the secret and restarting, invalidating all tokens on rotation, and retaining no old key. Origin/CSRF protection remains deferred; PR #24 was closed unmerged, and the limitation is disclosed for the current public deployment. The current Origin check is optional hardening rather than the agreed policy. Revisit the policy in a future security review.

The [auth/setup decision](sprints/sprint-1/auth-setup-proposal.md) records the accepted JWT scope, logout/account-change limits and key-management policy. Origin/CSRF protection remains deferred; PR #24 was closed unmerged, and the limitation is disclosed for the current public deployment. Revisit it in a future security review.

Keep real credentials outside Git and the report. The first implementation supplies placeholder configuration for database connection, session/cookie settings, allowed origin, runtime port and any seed identity inputs. Actual variable names, defaults and required/secret classifications are recorded in .env.example and deployment.md when selected; no runtime command is invented in this draft.

## UI structure and conventions

| Screen | Role and main interaction | Required observable states |
| --- | --- | --- |
| Sign in | Anonymous enters identity and password; authenticated users reach their allowed home | Ready, submitting, safe invalid-login message, unavailable service |
| Financial overview | User sees owned bank/card balances and income/expense totals | Loading, no activity, loaded, retryable failure |
| Accounts / opening balance | User selects an owned seeded bank account and records opening amount/date | Field errors, submitting, saved/retrieved value, forbidden/not found |
| New transaction | User chooses payment/charge or receive, primary account, date, total and allocation lines | Remaining/summed allocation feedback, field/domain rejection, submitting, saved result |
| Transaction history/detail | User retrieves saved records and allocations | Empty, loaded, safe inaccessible record, load failure |
| Platform users | Administrator sees identities and enables/disables under the agreed policy | Loading, loaded, rejected operation, success; no financial navigation |

Agreed baseline route labels are /login, /overview, /accounts, /transactions/new, /transactions, and /admin/users under D-07; feature PRs review any refinements. Use labelled fields, meaningful button names, keyboard access and readable status messages. Validate on both UI and server; retain entered values after a rejected submission. Revision 0.11: the server's `PAYMENT_LIMIT_EXCEEDED` message is shown in the existing alert region and the entered values are retained; the payment form may show a short hint (card charges are limited to THB 100,000.00 each) under Total when a Loan Taken primary account is selected. The server remains the authority. Disable duplicate UI submission while the request is pending; this alone does not establish an idempotent server API.

## Sprint 1 baseline API contract (agreed)

These are the agreed Sprint 1 baseline public interfaces. The session, administration, account/opening-balance, transaction and summary/history paths needed for F-01–F-06 are implemented on `sprint-1-staging`; later-sprint extensions remain contract-only. Monetary DTO fields are decimal strings under D-03; dates follow D-04. Each success returns only authorized data. Errors use a stable code and safe message, with field details only for the caller's own input. A reviewed feature contract may refine an interface before implementation and tests.

| Method / path | Input and success | Access and relevant errors |
| --- | --- | --- |
| POST /api/session | email/password -> current identity; session cookie | Generic invalid login; disabled user follows same safe message; service failure |
| GET /api/session | -> id, displayName, role claims from the verified token | 401 for a missing, invalid or expired token; role/account state may be stale until expiry under D-05 |
| DELETE /api/session | -> 204; clear the current browser cookie | No server-side revocation; a copied JWT remains valid until expiry under D-05 |
| GET /api/admin/users | -> identity list only | Administrator only; 401/403 |
| PATCH /api/admin/users/:id | enabled boolean -> updated safe identity | Administrator only; safeguards D-05; no financial properties; an already-issued token is unaffected until expiry (D-05) |
| GET /api/accounts | -> owned account identities/types and balances | User only; scoped before query |
| GET /api/accounts/:id | -> one owned account and its opening/balance state | User only; safe 404 outside ownership scope |
| PUT /api/accounts/:id/opening-balance | amount/date -> updated owned opening state | User only; safe 404 outside scope; opening/date/amount errors |
| POST /api/transactions | form, primaryAccountId, date, total, allocations, optional memo -> 201 saved transaction | User only; reject mismatched total, incompatible/foreign accounts, invalid amount/date; atomic failure; revision 0.11: a card charge (PAYMENT, Loan Taken primary) with total above 100,000.00 returns `422 PAYMENT_LIMIT_EXCEEDED`, atomic, nothing written (D-08) |
| GET /api/transactions and /api/transactions/:id | -> owned history or saved transaction with allocations | User only; safe 404 for inaccessible detail; later search/pagination specified separately |
| GET /api/summary?from=...&to=... | -> owned balances, income and expense for the agreed inclusive Asia/Bangkok reporting period | User only; validate range; no administrator/global aggregation |

Card charge example (PAYMENT with a Loan Taken primary account, allocated to two Expense accounts):

```json
{"form":"PAYMENT","primaryAccountId":"owned-card-id","date":"2026-11-02","total":"1200.00","allocations":[{"accountId":"owned-dining-id","amount":"700.00"},{"accountId":"owned-groceries-id","amount":"500.00"}]}
```

Transaction error outcomes relevant to revision 0.11 (existing codes are unchanged; one is added):

| Status / code | When | Revision |
| --- | --- | --- |
| 401 `UNAUTHENTICATED`; 403 `FORBIDDEN` (Administrator) | No/invalid credential; Administrator caller | Unchanged; precede the cap |
| 400 `INVALID_INPUT` (with `field`) | Shape, form, exact amount (above 1,000,000,000.00, more than two decimals, zero or negative), real date, 1 to 50 lines, memo | Unchanged |
| 404 `NOT_FOUND` | Any referenced account outside the caller's scope or unknown | Unchanged; precedes the cap |
| 422 `INVALID_ALLOCATION`, `ALLOCATION_MISMATCH`, `INCOMPATIBLE_ACCOUNT` | Allocation and type rules | Unchanged; precede the cap |
| **422 `PAYMENT_LIMIT_EXCEEDED`** | Card charge total above THB 100,000.00 | New in 0.11 (D-08); message: "A card charge cannot exceed THB 100,000.00." |
| 422 `INVALID_DATE`, `INSUFFICIENT_BALANCE` | Date and balance rules | Unchanged; follow the cap |
| 500 `INTERNAL_ERROR` | Persistence failure after rollback | Unchanged |

The example identifiers are fixtures, not deployed resources. D-07 approves these baseline DTOs, HTTP outcomes and error semantics; a feature PR may propose a reviewed refinement before tests and implementation. Tests must assert approved public responses and persisted outcomes.

## Atomicity, failures and delivery

Validate every allocation, date and ownership reference before committing. Save the transaction and allocation lines as one database transaction. Any rejected input or database failure leaves no partial financial record. D-03 rejects any transaction that would make a Cash, Loan Taken or Loan Given balance negative; lock the affected accounts and check their balances inside the same database transaction so competing writes cannot bypass the rule. Sprint 1 has no server idempotency key: the UI blocks repeat submissions while a request is in flight, clients do not automatically retry transaction POSTs, and a user checks history before manually retrying after an ambiguous timeout. A repeated POST can still create a duplicate; the system does not promise exactly-once delivery.

Lab 5 packages this application with Docker, runs meaningful build/tests on staging and main PRs, requires the passing checks, and deploys accepted main releases to GCP with durable storage. The starter kit is reference material. The planned service/database/registry, credentials, migrations and exact release commands remain unconfigured until the team selects and reviews them. Identify commit, image and running revision separately.
