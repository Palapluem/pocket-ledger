# System-Level Software Design Specification

Draft 0.2, 12 November 2026. Better T Stack is selected; exact runtime and image versions remain to be pinned. This is still a proposed design for team review, not an implemented architecture. D-03 to D-07 in [team decisions](decisions.md) govern the remaining product choices. The SRS defines the required product behavior.

## Architecture and responsibilities

Use a modular monolith with three logical layers. The team selected Better T Stack configured with TanStack Router for the frontend, Elysia for the backend, Bun as runtime and package manager, Better Auth for authentication, PostgreSQL with Drizzle ORM, Docker for local database setup and web/server deployment packaging, and Biome, Husky and Turborepo add-ons. API add-ons, payments and examples are disabled. D-02 records the confirmed stack; exact supported runtime/image versions and implementation contracts remain open. The application has not been scaffolded. Three logical layers do not require three servers or microservices.

```text
TanStack Router browser UI
  -> Elysia HTTP API
     -> identity / administration / financial application services
        -> exact money rules and ownership checks
           -> Drizzle ORM -> PostgreSQL
```

The browser owns input presentation and feedback. Better Auth provides the authentication foundation; the Elysia application establishes the authenticated identity, enforces product permissions and ownership, validates the complete transaction and controls the database transaction through Drizzle. PostgreSQL persists users/auth records, financial accounts, transactions and allocation lines. Client-supplied owner or role values never establish authority. Better Auth configuration, session storage and the mapping to PocketLedger's User/Administrator roles require an explicit implementation contract.

Balances are proposed to be derived from opening balances and persisted transaction/allocation effects rather than maintained in a second mutable balance cache. A query must use the same agreed sign rules as the domain contract. Test expected values must be independently calculated. If the team chooses a cache or a different persistence model, document its atomicity and reconciliation before implementation.

## Major data model

| Entity | Main fields and relationships | Constraints and lifecycle |
| --- | --- | --- |
| UserAccount | id, email, displayName, passwordHash, role, enabled, timestamps | Unique normalized identity; User or Administrator; no plaintext password |
| Session | id/tokenHash, userId, createdAt, expiresAt, revokedAt | Proposed D-05 policy: store only an opaque token hash; resolve the current enabled user and check expiry/revocation server-side |
| FinancialAccount | id, ownerId, name, type, currency, openingAmountMinor, openingDate | Five required types; owner is a User; opening policy D-03/D-04 |
| FinancialTransaction | id, ownerId, form, primaryAccountId, date, totalMinor, memo, createdAt | Positive exact total under D-03; supported form; primary account owned by same User |
| AllocationLine | id, transactionId, accountId, amountMinor, position | Positive exact amount; all accounts owned by transaction owner; sum equals total |
| Favourite / correction records | Future contract fields | Allocate in S2/S3; no unreviewed schema or implemented behavior claimed |

Use foreign keys and, where supported, owner/account composite references so cross-owner links cannot be introduced accidentally. A cross-row sum is validated inside the application/database transaction; do not claim that a simple per-row CHECK proves the allocation total. Record a migration and safe seed procedure with the first implementation. Re-running seed must preserve existing financial activity.

## Proposed money representation and effect matrix

D-03 proposes THB and two decimal places. Parse decimal strings exactly into integer satang; do not use binary floating-point multiplication as the financial calculation. Agree maximum amounts, supported opening-balance signs, insufficient funds and overpayment rules before affected tests/code. The following normal-balance convention is a proposal to make the required examples reviewable.

| Form / side | Account type | Change to its normal balance |
| --- | --- | --- |
| Payment primary | Cash | Minus transaction total |
| Charge primary | Loan Taken | Plus transaction total (debt grows) |
| Payment allocation | Expense | Plus allocation (expense grows) |
| Payment allocation | Loan Taken | Minus allocation (debt repayment) |
| Payment allocation | Loan Given | Plus allocation (receivable grows) |
| Payment allocation | Cash | Plus allocation (transfer received) |
| Receive primary | Cash | Plus transaction total |
| Receive allocation | Income | Plus allocation (income grows) |
| Receive allocation | Loan Given | Minus allocation (repayment received) |
| Receive allocation | Loan Taken | Plus allocation (new borrowing) |
| Receive allocation | Cash | Minus allocation (transfer sent) |

Income/expense summaries include only their relevant classification effects within the agreed date range. Opening balances, transfers, borrowing and debt repayments are excluded. Reject unsupported form/type combinations; confirm detailed same-account and mixed allocation rules under D-03. Sprint 1 implements the reviewed example combinations; Sprint 2 completes the remaining baseline combinations.

## Role and ownership matrix

| Operation | User | Administrator / anonymous |
| --- | --- | --- |
| Login / current identity / logout | Own session | Administrator uses own session; anonymous cannot read a protected identity |
| List platform identities; enable/disable | Forbidden | Administrator only, subject to agreed safeguards |
| Financial account, opening balance and transaction read/write | Own records and owned allocation references only | Forbidden for Administrator; anonymous unauthenticated |
| Balances, summaries, history and later favourites/duplicates | Own data only | Forbidden for Administrator; anonymous unauthenticated |

Proposed error precedence: establish authentication; enforce role; validate structural input; resolve the resource inside the caller's ownership scope; apply domain validation; persist atomically. An out-of-scope resource returns a safe not-found response; it must not disclose another user's name, amount or existence. List/summary queries are scoped before aggregation, not filtered after calculating global totals.

## Authentication and configuration

D-05 proposes an opaque server session in an HttpOnly cookie, a configurable expiry and immediate server-side rejection of disabled users on their next request. Logout revokes the session. Choose appropriate cookie security for local/cloud deployment, and protect authenticated writes against cross-site requests under the selected deployment model. Specify and test the mechanism before accepting the identity feature.

The [auth/setup proposal](sprints/sprint-1/auth-setup-proposal.md) records the Better Auth session-storage, expiry, cookie, route and local-setup questions for team review. It also proposes replacing Better Auth with a first-party session layer; that change is not agreed and the Better Auth description above stands until D-02 and D-05 are updated. It is not an approved implementation contract.

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

Proposed route labels are /login, /overview, /accounts, /transactions/new, /transactions, and /admin/users. Confirm them with D-07. Use labelled fields, meaningful button names, keyboard access and readable status messages. Validate on both UI and server; retain entered values after a rejected submission. Disable duplicate UI submission while the request is pending; this alone does not establish an idempotent server API.

## Proposed API contract

These are draft public interfaces, not existing endpoints. Monetary DTO fields are decimal strings under D-03; dates follow D-04. Each success returns only authorized data. Errors use a stable code and safe message, with field details only for the caller's own input.

| Method / path | Input and success | Access and relevant errors |
| --- | --- | --- |
| POST /api/session | email/password -> current identity; session cookie | Generic invalid login; disabled user follows same safe message; service failure |
| GET /api/session | -> id, displayName, role | 401 without a valid enabled identity |
| DELETE /api/session | -> 204; current session revoked | Define expired-session behavior consistently under D-05 |
| GET /api/admin/users | -> identity list only | Administrator only; 401/403 |
| PATCH /api/admin/users/:id | enabled boolean -> updated safe identity | Administrator only; safeguards D-05; no financial properties |
| GET /api/accounts | -> owned account identities/types and balances | User only; scoped before query |
| GET /api/accounts/:id | -> one owned account and its opening/balance state | User only; safe 404 outside ownership scope |
| PUT /api/accounts/:id/opening-balance | amount/date -> updated owned opening state | User only; safe 404 outside scope; opening/date/amount errors |
| POST /api/transactions | form, primaryAccountId, date, total, allocations, optional memo -> 201 saved transaction | User only; reject mismatched total, incompatible/foreign accounts, invalid amount/date; atomic failure |
| GET /api/transactions and /api/transactions/:id | -> owned history or saved transaction with allocations | User only; safe 404 for inaccessible detail; later search/pagination specified separately |
| GET /api/summary?from=...&to=... | -> owned balances, income and expense for the agreed period | User only; validate range; no administrator/global aggregation |

Proposed transaction example:

```json
{"form":"PAYMENT","primaryAccountId":"owned-card-id","date":"2026-11-02","total":"1200.00","allocations":[{"accountId":"owned-dining-id","amount":"700.00"},{"accountId":"owned-groceries-id","amount":"500.00"}]}
```

The example identifiers are fixtures, not deployed resources. Confirm DTO fields, HTTP statuses and error codes in D-07; tests must then assert the approved public responses and persisted outcomes.

## Atomicity, failures and delivery

Validate every allocation and ownership reference before committing. Save the transaction and allocation lines as one database transaction. Any rejected input or database failure leaves no partial financial record. For a balance-dependent limit that the team adopts, serialize the relevant decision or use a database constraint/lock so competing writes cannot bypass it. Do not add an unrequested overpayment/overdraft rule silently.

Lab 5 packages this application with Docker, runs meaningful build/tests on staging and main PRs, requires the passing checks, and deploys accepted main releases to GCP with durable storage. The starter kit is reference material. The planned service/database/registry, credentials, migrations and exact release commands remain unconfigured until the team selects and reviews them. Identify commit, image and running revision separately.
