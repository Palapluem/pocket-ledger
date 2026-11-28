# Sprint 1 feature engineering contracts

Draft 1.4, updated 28 November 2026. Revision 1.4 is the Lab 7 maintenance change D-08 (owner-set payment limit on Loan Taken accounts; AC-29 to AC-34; TEST-29, TEST-30, TEST-31). It was **agreed by Wisit and Natthawat on 28 November 2026**; **implementation status: implemented on branch `feature/52-payment-limit`, pending review** (contract PR #53). It supersedes the withdrawn fixed-cap draft 1.3. Revisions 1.0 to 1.2 below remain the accepted Sprint 1 contract at release `37593da`. Draft 1.2, updated 22 November 2026. Includes F-01 to F-06. PR #22 merged to `sprint-1-staging` at `7d8be8e`; PR #23 at `6048593`; PR #25 at `53c20ff`. N0TAW00D approved PR #25 head `420c6bd` before merge. CI #59 passed on that head: 125 server tests / 518 assertions across 14 files, 11 browser E2E tests, type checks, Biome, web build and production Docker image build. Clean-checkout TEST-27 passed on merge commit `53c20ff`; exact local setup and results are in `tests.md`. The E2E suite covers the committed-response-loss behavior for both payment and receive. D-05 key handling is agreed. Origin/CSRF protection remains deferred; PR #24 was closed unmerged, and the limitation is disclosed for the current public deployment. The team is in Section 1 (regular program). Since 19 Nov, the accepted Sprint 1 release on `main` is `265c995` (release PR #32, deployed to Cloud Run; register in `docs/releases.md`); release-matched TEST-27 passed on it (`tests.md`). Release PR #38 then advanced `main` to `37593da`, which deploys the same application code with only a TEST-28 test fix and documentation (`docs/releases.md`).

## Contract identity and revision

| Field | Value / evidence |
| --- | --- |
| Baseline and design | SRS, feature inventory, traceability and System-Level SDS in docs/ |
| Decision work | Issue #1 financial/scope/interfaces; Issue #2 team/runtime/authentication; [auth/setup decision](auth-setup-proposal.md) |
| Documentation review | PR #4 merged after N0TAW00D approval; PR #5 and #6 reviewed and merged by Palapluem; PR #7 approved by Palapluem and merged at `3e8bc5f`; PR #9 selected the JWT approach (D-02, D-05). No implementation or product tests are claimed |
| Implementation Issue / branch / owner / reviewer | Issue #20 / `feature/20-accounts-receive-reconcile` / Wisit / Natthawat (approved PR #25; merged at `53c20ff`) |
| Contract revision and pre-code commit | Revision 0.6, commit `90aeab6`; implementation and executable financial tests had not started at that commit |

| Revision | Reason | Approval and implementation impact |
| --- | --- | --- |
| 0.1, 7 November 2026 | Establish actual PocketLedger draft contracts and STS instead of old TokTickIT report content | Team decisions/review pending; no retrospective approval claimed |
| 0.2, 13 November 2026 | Align F-01 with the JWT approach selected in PR #9: no server-side session or revocation; spec-level outcomes only | Documentation only; implementation details stay open until recorded |
| 0.4, 15 November 2026 | Record the agreed D-01 to D-07 Sprint 1 decisions, baseline routes/DTOs, financial boundaries, work ownership and explicit NOT RUN financial tests | Integrated through PR #15 at `98afb3b`; F-03 to F-06 implementation and executable financial tests remain pending. |
| 0.5, 15 November 2026 | Add the shared client-side transaction submission/no-auto-retry acceptance criterion | BR-13 / AC-28 / TEST-28 added; no server idempotency guarantee. Included in PR #15 at `98afb3b`. |
| 0.6, 15 November 2026 | Detail the F-03/F-04 account, opening-balance and salary-receipt interfaces before implementation | Issue #20; testable request/response shapes, validation outcomes and persistent data constraints are specified below. No execution result is claimed by this revision. |
| 0.7, 15 November 2026 | Issue #21 refines the F-05/F-06 interface within D-03/D-04/D-07: response DTOs, error codes, history order and the summary range (see "F-05/F-06 implemented interface") | Implemented in PR #22 on the shared schema; CI and review status are recorded in the coordination history. No financial rule changes |
| 0.8, 16 November 2026 | Reconcile F-03/F-04 with PR #22's canonical API/service and PR #23's schema; make the `openingAmount` DTO and Sprint 1 salary-only RECEIVE boundary consistent; record actual verification in `tests.md` | No new schema or migration. Implementation is stacked on PR #22 and remains subject to teammate review before staging integration. |
| 0.9, 16 November 2026 | Complete the F-03/F-04 reconciliation: require a fresh account GET after opening-balance updates, order equal-name accounts by ID, align receive memos with the 200-character API limit, and verify UI feedback and safe repeat-submission behavior | No new schema or migration. Added direct assertions for persisted account reads, unchanged owner state after a foreign update, and receive-form no-retry behavior. Results remain tied to the tested candidate, not main or staging. |
| 1.0, 16 November 2026 | Clarify that an opening-balance effective date cannot be later than today in Asia/Bangkok; reject it at the API and cap the date input; add a public-API regression test proving a fresh account read is unchanged | Wisit confirmed the rule while resolving PR #25 review; N0TAW00D approved the updated head and CI #59 passed. No other financial rule changes. |
| 1.1, 16 November 2026 | Record the peer-approved PR #25 merge, exact-head CI #59, and clean-checkout TEST-27 result on the integrated staging candidate | N0TAW00D approved PR #25 head `420c6bd`; merge `53c20ff`. This records staging evidence only; accepted-main verification remains pending. |
| 1.3, 28 November 2026 (superseded, withdrawn) | First Lab 7 draft: a fixed THB 100,000.00 cap on a card charge (AC-29 to AC-33, TEST-29/30), opened as PR #53 | Withdrawn after Wisit's review (changes requested, 28 November): the change was too small (one constant and one guard), and its wording implied card-only behavior although the model has one Loan Taken type for cards and other loans. It was never agreed, tested or implemented. Its AC IDs 29 to 33 are reassigned in 1.4; the pushed commits are kept as history |
| 1.4, 28 November 2026 | Lab 7 change D-08 (revised): the owner may set an optional per-transaction payment limit on each of their own Loan Taken accounts; a `PAYMENT` with that primary account and a total above the limit is rejected with `422 PAYMENT_LIMIT_EXCEEDED`. Adds the owner-scoped `PUT /api/accounts/:id/payment-limit`, a `paymentLimit` field on the account DTO, a nullable column and migration, and a UI editor. Revises D-03/BR-10/AC-16 for payments on Loan Taken accounts. AC-29 to AC-34; TEST-29, TEST-30, TEST-31 | Agreed by Wisit and Natthawat on 28 November 2026 after the PR #53 review; no code or test is written until the contract PR is approved and integrated. Chosen as a new revision (not a rewrite of 1.3) because 1.3 was already pushed and reviewed; AGENTS.md requires pushed contract history to be preserved. Pre-change baseline: accepted release `37593da1cb3cd881e6b22845a2b4a929dbf6bc8e` (PD1 `265c995` is code-identical). Agreement recorded: 28 November 2026 (Wisit and Natthawat). Implementation: implemented on branch `feature/52-payment-limit`, pending review. AC-01 to AC-28 expected results do not change |

## F-01 Identity and access

User goal: sign in and use only the operations allowed by the signed-in identity's role. Preconditions are a seeded User or Administrator and an available persistent identity store. On valid credentials, issue the approved signed credential and return the current identity. Protected requests derive identity and role server-side from the verified credential. Logout clears the credential in the browser. Invalid credentials and disabled identities receive a safe response.

Dependencies: D-02, D-05 and D-07. UI: Sign in and role-appropriate navigation, including ready/submitting/failure states. API: the three /api/session operations in the System SDS. Data: UserAccount; the credential is a signed token and has no server-side session record. Password hashing and backend access tests are required. D-05 records the accepted logout/account-change limits, 3600-second lifetime, HS256/`jose`, and key-management policy. Origin/CSRF policy, including missing-Origin handling, remains deferred; PR #24 closed unmerged, and the limitation is disclosed for the current public deployment. The current Origin guard is optional hardening, not a team policy.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-01 | Valid enabled User and Administrator log in and retrieve the correct current identity/role | FR-01; NFR-01 | TEST-01 |
| AC-02 | Wrong/unknown/disabled identity receives the approved safe login failure; no session or private data is returned | FR-01; BR-11; NFR-01 | TEST-02 |
| AC-03 | Anonymous callers and callers with an invalid, tampered or expired credential cannot reach protected operations | FR-01; BR-01/02; NFR-01 | TEST-03 |
| AC-04 | After logout the browser no longer holds a credential and cannot retrieve protected financial or administration data; copied-token reuse follows D-05 | FR-01; NFR-01 | TEST-04 |
| AC-05 | Disabling a User blocks new login; the effect on an already-issued credential follows D-05 (it remains usable until expiry while its signing key is accepted) | FR-01/02; BR-11 | TEST-05 |

## F-02 Platform user administration

User goal: an Administrator controls platform access without seeing finances. Load a safe identity list, select a user, change enabled state, then retrieve the new state. A rejected safeguard leaves identities unchanged. No administrator financial overview or financial API exception is allowed.

Dependencies: F-01 and accepted D-05/D-07. UI: Platform users list and enabled-state action with loading/success/error feedback. API: GET/PATCH /api/admin/users. Data: update identity access only. The agreed last-enabled-administrator safeguard is recorded in D-05; no financial data is exposed.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-06 | Administrator retrieves only safe user identity fields and persists an enable/disable operation; the last enabled Administrator can never be disabled (`409 LAST_ADMIN_FORBIDDEN`, state unchanged), judged against current database state rather than the token's role snapshot | FR-02; BR-11 | TEST-06 |
| AC-07 | User and anonymous callers cannot list or change platform users | FR-02; NFR-01 | TEST-07 |
| AC-08 | Administrator calls to financial account, transaction and summary operations are rejected without financial data | BR-02; NFR-01 | TEST-08 |

## F-03 Financial accounts and opening balance

User goal: start the required journey with owned bank/card/income/expense records and record an opening bank balance. Safely seed two Users with distinct accounts plus an Administrator. The acting User selects their seeded bank account, enters the opening amount/date, then makes a fresh GET request for that account and verifies the persisted result. The opening amount affects the balance but not current-period income/expense.

Dependencies: F-01, D-03/D-04/D-07. UI: an Accounts screen lists the signed-in User's seeded accounts; the User selects the bank account, enters an opening amount/date, saves, then reloads the account to verify the persisted result. Show validation, pending, success and retryable failure states. The User cannot choose an account owned by another User or the Administrator.

API and data contract:

- `GET /api/accounts` returns the signed-in User's accounts only, ordered by type, name and ID. Each item is `{ id, name, type, currency, openingAmount, openingDate, balance }`; money values are normalized decimal strings with two places and `currency` is `THB`. `type` is one of `CASH`, `LOAN_GIVEN`, `LOAN_TAKEN`, `INCOME` or `EXPENSE`. `balance` is derived from the opening amount and persisted transaction effects; it is not a separately mutable cache.
- `GET /api/accounts/:id` returns the same safe representation for one owned account. An unknown or foreign ID returns the same `404 NOT_FOUND` shape; no account name, amount, owner or existence detail is disclosed.
- `PUT /api/accounts/:id/opening-balance` accepts `{ amount: "10000.00", date: "2026-11-01" }` and returns the updated account representation. The canonical amount field is `openingAmount`. The amount is a non-negative exact decimal string with at most two fractional digits; no rounding, exponent notation, sign or binary floating-point conversion is allowed. The date is a valid `YYYY-MM-DD` calendar date no later than today in Asia/Bangkok. Only balance-bearing account types accept an opening state. A changed opening state is allowed after activity only when every affected transaction is on/after the new opening date and the recomputed normal balance is non-negative. The update is atomic.
- Account records have a User owner, stable seeded key, type, THB currency, integer-satang opening amount and nullable opening date. Seed only missing records for enabled User identities; never reset an existing opening state or financial activity. Do not seed finance records for Administrators.

Authentication errors are `401 UNAUTHENTICATED`; an Administrator is rejected with `403 FORBIDDEN`; a foreign/unknown account is `404 NOT_FOUND`; malformed values return `400 INVALID_INPUT`; an opening-date or balance-rule violation returns `422 RULE_VIOLATION`. Every error uses the existing `{ code, message }` JSON shape. Full five-type account management remains in Sprint 2; this Sprint 1 UI supports recording the opening state for the seeded bank account.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-09 | Synthetic identities/accounts are reproducible; rerunning seed preserves existing user financial activity | FR-03; BR-12; NFR-04 | TEST-09 |
| AC-10 | User records and retrieves the opening bank balance/date; balance matches the independent expected value. An opening date after today in Asia/Bangkok is rejected without changing the account. A transaction date cannot precede the opening date of any balance-bearing account it affects | FR-04; BR-05/08/10 | TEST-10/24 |
| AC-11 | Opening balance does not appear as salary, income or expense in the selected summary | FR-04; BR-06 | TEST-11 |
| AC-12 | User B cannot read/change User A's accounts or opening state; responses reveal no private values | BR-01; NFR-01 | TEST-12 |

## F-04 Receive money

User goal: record salary received into an owned bank account. Select Receive money, the owned bank, date and total; allocate that total to the owned salary Income account; submit; retrieve the saved transaction and balances. Reject invalid input or inaccessible account references without financial effects.

Dependencies: F-01/F-03, D-03/D-04/D-07. UI: the User chooses Receive money, selects the seeded bank and salary accounts, enters date and total, submits once, then retrieves the saved transaction and refreshed account balances. Disable repeat activation while the request is pending. Show validation, pending, saved and retry guidance if the response is ambiguous. This Sprint 1 contract does not claim the later loan/transfer receive combinations are implemented.

API and data contract:

- `POST /api/transactions` accepts `{ form: "RECEIVE", primaryAccountId, date, total, allocations: [{ accountId, amount }], memo? }`. The primary account must be an owned `CASH` account; each allocation must reference a distinct, owned `INCOME` account. Sprint 1's receive path is salary/income only. Other allocation types allowed by the whole-product SDS are deferred to Sprint 2.
- A transaction amount and every allocation amount are decimal strings greater than 0, at most `1000000000.00`, with no more than two fractional digits. Values are parsed exactly into integer satang. The allocation sum must equal the total exactly. At least one allocation is required; duplicate allocation accounts and using the primary account as an allocation are rejected.
- Transaction dates are valid `YYYY-MM-DD` dates from the opening date of the primary account through today's Asia/Bangkok calendar date. Income/Expense classification accounts do not impose an opening-date boundary. Invalid or foreign account references are rejected before writing. Persist the transaction and all allocation lines in one database transaction.
- `POST` returns `201` with the saved transaction ID, form, primary account, date, total and complete allocations. `GET /api/transactions/:id` returns that same persisted detail for its owner; `GET /api/transactions` returns the owner's records only. A User cannot read another User's record; Administrators cannot call any financial endpoint.
- Mismatched totals, incompatible account types, repeated/primary allocation accounts and date or balance-rule failures return `422 RULE_VIOLATION`; malformed JSON/shape/value returns `400 INVALID_INPUT`; foreign/unknown IDs return `404 NOT_FOUND`; database failure returns a safe `500 INTERNAL_ERROR`. A rejected request leaves no transaction, allocation or balance effect.

The agreed independent example starts with a bank opening balance of THB 10,000.00 on 2026-11-01, then receives THB 20,000.00 salary on 2026-11-02. The persisted result is bank THB 30,000.00 and salary Income THB 20,000.00. The opening balance is not counted as income. The response is retrieved in a fresh API request before the UI reports the journey complete.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-13 | Salary receipt is saved/retrieved with the correct bank and Income effect | FR-06/07/08; BR-05 | TEST-13 |
| AC-14 | Receive allocation total different from the transaction total is rejected; records and balances remain unchanged | BR-03/07 | TEST-14 |
| AC-15 | Required account types and ownership are checked for every primary/allocation reference before save | BR-01/04 | TEST-15 |
| AC-16 | Amount/date inputs obey D-03/D-04; invalid range/scale/sign/date is rejected without silent rounding or financial effects | BR-08/10 | TEST-16 |

## F-05 Payment or charge

User goal: record a 1,200 card purchase split between dining and groceries, then repay 500 from the bank. The purchase is a `PAYMENT` with the card (Loan Taken) as primary account; the repayment is a `PAYMENT` from the bank (Cash) allocated to the card. Purchase increases debt and Expense once; repayment reduces bank money and card debt without creating a second expense. Retrieve both records and their independent expected balances.

Dependencies: F-01/F-03, D-03/D-04/D-07 and the shared transaction model with F-04. UI/API/data use the same approved transaction interfaces and preserve distinct form semantics. Validate the complete allocation before committing. Database failure must roll back every persisted part.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-17 | Split card purchase persists both allocations; card debt and Expense change by the independent expected amounts | FR-05; BR-05 | TEST-17 |
| AC-18 | Bank-to-card repayment reduces bank balance and card debt; income/expense totals do not change | FR-05/07/08; BR-06 | TEST-18 |
| AC-19 | Mismatched payment allocations are rejected; no transaction, line or balance effect remains | BR-03/07 | TEST-19 |
| AC-20 | A failure during persistence rolls back all transaction/allocation writes; fresh API reads match the pre-request state | BR-07 | TEST-20 |
| AC-21 | User B and Administrator cannot retrieve or modify User A's transaction or inject an inaccessible allocation account | BR-01/02; NFR-01 | TEST-21 |

AC-15 and AC-16 also apply to payment/charge inputs, not only salary receipt.

### Shared transaction submission behavior

This criterion applies to the F-04 and F-05 transaction forms. It protects against accidental duplicate submissions in the browser; it does not make the server operation idempotent.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-28 | While a transaction POST is pending, rapid repeat activations do not send another request. The client does not automatically retry. If the outcome is ambiguous, the user is told to check transaction history before choosing to submit again; duplicate creation remains possible because Sprint 1 has no server idempotency key. | BR-13; D-04 | TEST-28 |

### Owner-set payment limit on Loan Taken accounts (Lab 7 revision 1.4, D-08)

**Status: agreed by Wisit and Natthawat on 28 November 2026; implementation status: implemented on branch `feature/52-payment-limit`, pending review.** This revises F-03 (account representation and one new owner-scoped setter) and F-05 (one new transaction rule). It does not change the text or expected results of AC-01 to AC-28. It revises, for payments on Loan Taken accounts, the D-03 "maximum single amount" and AC-16.

- **Old rule (accepted Sprint 1, release `37593da`):** every transaction total is between 0.01 and THB 1,000,000,000.00 with at most two decimals. There is no per-account limit.
- **New rule and scope:** the owner may set an optional per-transaction **payment limit** on each of their own **Loan Taken** accounts. Loan Taken is one account type that covers a credit card and any other loan the user owes (glossary), so the rule applies by account type to every Loan Taken account; it is not card-specific. When a limit is set, a `PAYMENT` whose primary account is that Loan Taken account (a charge that increases the debt) with a total **greater than** the limit is rejected with `422 PAYMENT_LIMIT_EXCEEDED` and message `A payment from this account cannot exceed THB {limit}.`, where `{limit}` is that account's stored limit as a plain two-decimal string, the same format as `paymentLimit` and every other money value in the API (no thousands separator), for example `100.00` or `2500.50`. The message is built from the stored limit, never a constant. Nothing is written and no balance changes. A total **equal to** the limit is accepted. A null limit, the default for every existing and seeded account, keeps the old behavior exactly.
- **Not affected:** a `PAYMENT` from a Cash primary account (including a repayment into a Loan Taken account), every `RECEIVE`, and a Loan Taken account with no limit. A limit on one account never applies to another account or another User.
- **Setting the limit (new endpoint):** `PUT /api/accounts/:id/payment-limit` with body `{ "paymentLimit": "100.00" }` or `{ "paymentLimit": null }`; success is `200` with the updated account DTO. It follows `PUT /api/accounts/:id/opening-balance`: same sign-in and User-role guard, same Origin guard, same `{ code, message }` error shape, the account row locked inside one database transaction.
  - A valid value is a decimal string matching the existing amount format: 0.01 to 1000000000.00, at most two decimals, no sign, exponent or surrounding whitespace. The response normalizes it to two decimals (`"250"` becomes `"250.00"`).
  - A missing key, a non-string non-null value, or a malformed, zero, negative, over-scale or above-maximum string is `400 INVALID_INPUT` with `field: "paymentLimit"`, message `Enter a limit between 0.01 and 1,000,000,000.00 THB with at most two decimal places, or clear it.`, and no change. `null` clears the limit (clearing an already clear limit is `200`).
  - Error precedence, as in the opening-balance endpoint: `401 UNAUTHENTICATED`; `403 FORBIDDEN` (Administrator); `400` body validation; `404 NOT_FOUND` for a non-UUID, unknown or foreign account (no disclosure); then the account-type rule.
  - A well-formed request for an account that is not Loan Taken (including `null`) is **`422 RULE_VIOLATION`**, the same outcome the opening-balance endpoint gives for an unsupported account type. It is not `400`, because the request is structurally valid and the account's type forbids the operation, which is the repository's existing convention for resource-state rules.
  - Lowering a limit below earlier payments, raising it and clearing it are all allowed; saved transactions are never re-validated.
- **Account DTO:** `GET /api/accounts`, `GET /api/accounts/:id`, the `accounts` list inside `GET /api/summary` and the PUT response gain `paymentLimit: string | null` (two-decimal string or null). All other fields and their values are unchanged. A client must treat a missing value as null.
- **Check order in `POST /api/transactions`:** `401`; `403`; structural validation in `parseTransaction` (`400 INVALID_INPUT`, including the shape of the calendar date; this runs before any database access and does not move); owner-scoped, locked account lookup (`404`); distinct-line/primary-line and allocation-sum rules; form/type compatibility; **payment limit**; the D-04 date-bound checks in `saveTransaction` (not later than today, not before an affected opening date); the balance check. Only the limit check is new. An over-limit payment is always `PAYMENT_LIMIT_EXCEEDED`, never `INVALID_DATE` for a date-bound failure or `INSUFFICIENT_BALANCE`. A foreign or unknown account is `404` whatever the amount.
- **Applies on create only.** Saved transactions are untouched and readable; history, summary and balances do not change. The opening-balance endpoint leaves the limit unchanged. Whether F-07 correction and F-08 duplicate saves apply the limit is for those sprint contracts to decide.
- **Persistence:** one migration (`0005_payment_limit.sql`, with its Drizzle journal entry and snapshot) adds nullable `accounts.payment_limit_satang bigint` with `CONSTRAINT accounts_payment_limit_range CHECK (payment_limit_satang IS NULL OR payment_limit_satang BETWEEN 1 AND 100000000000)`. The database does not restrict the column to Loan Taken accounts (that would need a trigger or cross-table rule); the application enforces it, and TEST-31 covers it. Seeding only inserts missing starter accounts, so a rerun never overwrites a user-set limit.
- **Concurrency:** `saveTransaction` locks the referenced account rows (`FOR UPDATE`) in one database transaction and reads the limit from the locked primary row; the setter locks the same row. A limit change and a payment on the same account are serialized: the payment is judged against either the old or the new limit, never a mixture.
- **UI:** each Loan Taken account card on the Accounts screen shows the current limit (`฿100.00` or `No limit`) and a "Payment limit" editor beside the opening-balance editor: labelled field "Payment limit amount (THB)", buttons "Save payment limit" and "Clear payment limit", server errors in a `role="alert"` region, success in a `role="status"` region ("Payment limit saved and retrieved from the account record." / "Payment limit cleared."), and the saved value is confirmed by a fresh account read as the opening-balance editor does. Other account types show no editor. The payment form shows the server's `PAYMENT_LIMIT_EXCEEDED` message in its existing alert, keeps the entered values and the AC-28 single-submission behavior, and navigates away only on success.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-29 | The owner sets, changes and clears the payment limit of an owned Loan Taken account: valid values return `200` with the normalized `paymentLimit`; fresh account reads (detail, list, summary) and the stored satang value agree; `null` clears it; every account starts with `paymentLimit: null`; lowering below earlier payments is allowed and leaves history and balances unchanged; an opening-balance update and a seed rerun keep the limit | FR-03; BR-14 | TEST-31 |
| AC-30 | Invalid limit values are rejected with `400 INVALID_INPUT` (`field: "paymentLimit"`) and a non-Loan-Taken account with `422 RULE_VIOLATION`, each with no change to the account; the stored value cannot leave 1 to 100000000000 satang | FR-03; BR-10/14 | TEST-31 |
| AC-31 | Setter access and ownership: anonymous `401`; Administrator `403`; another User's, unknown or non-UUID account `404` with the owner's account unchanged; a disallowed Origin is rejected as for every other PUT | BR-01/02; NFR-01 | TEST-31 |
| AC-32 | With a limit set on a Loan Taken account, a `PAYMENT` with that primary account and total above the limit is rejected with `422 PAYMENT_LIMIT_EXCEEDED`; counts and balances are unchanged on a fresh read; a total equal to the limit is accepted (`201`); a split payment is judged on its total; the limit is reported before the D-04 date bounds and before `INSUFFICIENT_BALANCE`, while the structural date check (`400`) and ownership (`404`) still come first; with no limit (default or cleared) behavior is unchanged | FR-05; BR-07/10/14 | TEST-29 |
| AC-33 | Scope is limited: a Cash `PAYMENT`, a repayment into the limited loan, a `RECEIVE`, another Loan Taken account without a limit and another User's account are unaffected even above the limit; amounts above 1,000,000,000.00, with excess scale, zero or negative are still `400`; AC-17 to AC-24 and AC-28 results are unchanged | FR-05/06; BR-10/14 | TEST-29; TEST-13 to TEST-28 as regression |
| AC-34 | In the browser the owner sets and clears the limit from a Loan Taken card (non-Loan-Taken cards show no editor; an invalid value shows the server error in the alert; the saved value is shown after a fresh read), and an over-limit payment shows the server message in the payment form's alert while a fresh read shows unchanged balances and history | FR-03/05; BR-14; NFR-03 | TEST-30 |

## F-06 Balances, summaries and history

User goal: inspect the saved financial outcome and explain its sources. After opening balance, salary, split purchase and repayment, retrieve owned balances, income/expense summary and transaction history. The persisted detail exposes the correct allocation values. A later application restart must preserve these records. Summary period/date comparisons follow D-04.

Dependencies: F-01/F-03/F-04/F-05 and D-03/D-04/D-07. UI: Financial overview and history/detail, including loading/empty/failure feedback. API: owned accounts, transaction list/detail and summary. Reads scope ownership before aggregation. Later search/filter/category reporting is allocated in the plan.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-22 | End-to-end fixture gives bank 29,500, card debt 700, Income 20,000 and Expense 1,200 under the D-03 THB convention | FR-07/08; BR-05/06 | TEST-22 |
| AC-23 | Fresh history/detail reads return saved forms, totals and complete allocations in the approved stable order | FR-09; BR-01 | TEST-23 |
| AC-24 | Records at the approved opening/reporting boundaries are included/excluded exactly under D-04; invalid ranges fail safely | FR-08/09; BR-08 | TEST-24 |
| AC-25 | Required sign-in/transaction/history controls are labelled and keyboard-operable; account flows present usable loading, error and empty feedback, and the required screens fit the 390, 768 and 1280 px target widths | NFR-03 | TEST-25 |
| AC-26 | The same saved identifiers and financial values survive an actual local application restart; Lab 5 additionally verifies redeployment | NFR-02 | TEST-26 |
| AC-27 | Clean setup, safe seed, production build and documented tests work at an identified commit with placeholder configuration | NFR-04; BR-12 | TEST-27 |

## F-05/F-06 implemented interface (Issue #21, revision 0.7)

- Shared model: the canonical schema from PR #23 (Issue #20): `accounts`, `transactions`, `transaction_allocations`, `*_satang` columns and owner-scoped composite foreign keys. Dates are `YYYY-MM-DD`. Balances are derived, never stored. A balance account without an opening date cannot be used in a transaction yet (`422 INVALID_DATE`).
- Seed: every User gets the starter accounts (account keys `bank`, `credit-card`, `salary`, `dining`, `groceries`): Bank (Cash), Credit card (Loan Taken), Salary (Income), Dining and Groceries (Expense), opening 0 on the seed date. Reseeding inserts only missing account keys and never changes existing accounts or activity.
- `GET /api/accounts` → owned accounts `{id, name, type, currency, openingAmount, openingDate, balance}` ordered Cash, Loan Taken, Loan Given, Income, Expense, then name and ID.
- `POST /api/transactions` → `201` with `{id, form, primaryAccountId, date, total, memo, createdAt, allocations: [{accountId, amount}]}`; allocations keep their submitted order. Memo is optional and limited to 200 characters. One service applies the System SDS effect matrix to both forms after enforcing each Sprint 1 form's account-type rules, including F-04's salary/income-only scope.
- `GET /api/transactions` → owned history, newest date first, then newest created; `GET /api/transactions/:id` → the same DTO.
- `GET /api/summary` → `{from, to, income, expense, accounts}`; without `from`/`to` it covers all dates; with both it is inclusive; one bound, an invalid date or `from > to` is `400 INVALID_RANGE`. Balances are current.
- Errors, in precedence order: `401 UNAUTHENTICATED`; `403 FORBIDDEN` for an Administrator; `400 INVALID_INPUT` with `field` (shape, form, exact amount, real date, 1 to 50 lines, memo ≤ 200); `404 NOT_FOUND` for any account or transaction outside the caller's scope. For `PAYMENT`, repeated/primary allocation accounts return `422 INVALID_ALLOCATION`; mismatched totals return `422 ALLOCATION_MISMATCH`; incompatible types return `422 INCOMPATIBLE_ACCOUNT`; invalid dates return `422 INVALID_DATE`; and a negative balance returns `422 INSUFFICIENT_BALANCE`. For Sprint 1 salary `RECEIVE`, those allocation, type, date and balance rule failures return `422 RULE_VIOLATION`. A database failure returns `500 INTERNAL_ERROR` after rollback, without internal details.
- UI: the overview shows balances, income/expense and history for a User, including an empty-history message, a loading status and a safe failure alert with no financial figures plus a "Try again" action. The payment form's account load has the same loading/failure feedback. "Receive money" saves a salary `RECEIVE` to an owned Cash account with owned Income allocations; "Make a payment or record a charge" saves one `PAYMENT`. Both transaction forms block repeat activation while pending, never retry automatically and tell the User to check history after an uncertain outcome (AC-28).

## Product Definition of Done

- Resolve applicable D-01 to D-07 decisions and record the teammate-reviewed contract revision before dependent implementation.
- Implement the agreed behavior and backend permissions; execute planned unit/API/database and selected UI/E2E checks with meaningful assertions.
- Preserve intended red-before-green evidence for a financial rule and an access restriction; report every failed/skipped/unexecuted result honestly.
- Provide safe reproducible setup, migrations/seed, dependencies/environment examples and actual run/build/test commands.
- Obtain specific teammate reviews, integrate through sprint staging, run integration/acceptance checks and review the release into main.
- Record the immutable release, final test version, both students' contributions and known incomplete work. Complete Parts A-F in the report without old TokTickIT evidence.

## Contract and execution gates

| Gate | Actual evidence |
| --- | --- |
| Applicable decisions agreed by both students | |
| Contract/test-design revision before code | |
| Implementation Issues/branches and peer reviews | |
| Tests/build with exact commit and failures/skips | |
| Accepted main release | |
