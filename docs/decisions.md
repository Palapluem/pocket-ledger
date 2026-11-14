# Team decisions

This is the single decision register for PocketLedger. Assignment requirements are identified in the SRS. A proposal below is a reviewable design choice, not a recorded agreement by both students. Do not implement behavior governed by an open decision until its answer and teammate review are recorded.

## Confirmed context

- Product: PocketLedger; Theme 7, Personal Money and Expense Logging System.
- Team: Wisit Suwannao (Palapluem) and Natthawat Primsirikunawut (N0TAW00D).
- LEB2 group name: **2-Nor**, clarified by the student on 7 November 2026. Do not infer a section or a separate group number from this name.
- The product and course repositories are independent Git roots. The product uses reviewed integration into sprint-1-staging, followed by a reviewed release into main.
- On 7 November the student requested preparation of the engineering documents and correction of the two report tabs. The student explicitly said that the stack and financial proposals below have **not** been agreed by the team.

| Decision | Owners | Status | Work affected |
| --- | --- | --- | --- |
| D-01 Team identifiers and rotating work | Wisit + Natthawat | PARTIAL: group name and Sprint 1 work split agreed in this PR; section open | Submission identity and task ownership |
| D-02 Stack and reproducible runtime | Wisit + Natthawat | STACK CONFIRMED; FIRST-PARTY JWT SELECTED FOR SPRINT 1; RUNTIME/IMAGE PINS AGREED | System SDS, setup and implementation |
| D-03 Money, balance signs and account compatibility | Wisit + Natthawat | AGREED FOR SPRINT 1 | Financial contracts and expected values |
| D-04 Dates, opening balances and correction boundary | Wisit + Natthawat | AGREED FOR SPRINT 1 | History, summaries and validation |
| D-05 Authentication and deactivation | Wisit + Natthawat | JWT MODEL AGREED; 3600 s + HS256/jose APPROVED; KEY SOURCE/ROTATION AGREED; REQUEST-PROTECTION MECHANISM OPEN | Identity, authorization and administrator contract |
| D-06 Sprint 1 scope and feature ownership | Wisit + Natthawat | AGREED | Sprint plan and implementation Issues |
| D-07 Public interfaces and verification | Wisit + Natthawat | AGREED FOR SPRINT 1 EXAMPLES; FEATURE INTERFACES REVIEWED PER FEATURE PR | API/data/UI contract and STS |

## D-01 Team identifiers and rotating work

LEB2 group name is 2-Nor. Section and any separate team number remain blank in the report identity table until confirmed. Repository access for N0TAW00D was verified as write access on 7 November; this is access evidence, not a completed contribution.

Both students must participate in design, tests, implementation, agent supervision, review and delivery. Assign bounded features or checks, then rotate. The suggested first work split is an identity/access slice and a financial-transaction slice, with the other student reviewing each. Sprint 1 assignment (agreed): Natthawat implemented F-01 and F-02 with Wisit reviewing; Wisit implements F-03 (accounts and opening balance) and F-04 (receive money) with Natthawat reviewing; Natthawat implements F-05 (split purchase and repayment) and F-06 (balances, history and summary) with Wisit reviewing. Pair work must name both participants in the relevant Issue or PR.

## D-02 Stack and reproducible runtime

The team selected Better T Stack with TanStack Router, Elysia, Bun, PostgreSQL, Drizzle ORM, Docker database setup and Docker web/server deployment. API add-ons and payments are disabled. Use Bun as the package manager, Biome for formatting/linting, Husky for local Git hooks, and Turborepo for workspace orchestration. No example features are included. Better Auth was included in the initial stack choice confirmed in PR #5 on 12 November 2026; on 13 November, the team selected first-party stateless JWT authentication for Sprint 1 seeded users, as recorded in this PR and the [auth/setup decision](sprints/sprint-1/auth-setup-proposal.md#selected-sprint-1-approach-first-party-signed-jwt). Agreed pins: Bun 1.4.4 everywhere (`packageManager`, CI `setup-bun`, and the `oven/bun:1.4.4` container base) and PostgreSQL `postgres:18.4` for local, test, CI and deployment. Upgrade a pin only through a reviewed PR that changes every location together.

The repository is a single product workspace. Keep the frontend and Elysia backend in that workspace, with PostgreSQL as the persistent relational store and Drizzle as its schema/migration/query layer. For Sprint 1, the application verifies signed JWT claims for seeded-user authentication; product role and ownership authorization remain application responsibilities. Docker is the local database and deployment packaging target. Keep local development, CI and container images on the same pinned Bun version. Resolve the actual template output, supported versions, environment variable names, scripts and container topology during setup; do not infer them from the generator name. No cloud resource is established by this decision.

## D-03 Money, balance signs and account compatibility

Proposal for Sprint 1: one currency, THB; positive transaction amounts with at most two decimal places; integer satang for arithmetic and storage; no implicit rounding. Agree a maximum amount within the selected database/integer limits before coding. Opening-balance signs and overdraft/overpayment behavior need an explicit answer; they are not inferred from the positive-transaction rule.

Proposed normal balances: Cash is money held; Loan Given is money receivable; Loan Taken is debt owed; Income and Expense record their respective classifications. The effect table in the System SDS makes each sign explicit. All referenced financial accounts must belong to the acting User. An Administrator never gains financial access. The two required transaction forms and their assignment-defined allocation categories must remain supported by the product baseline.

The required property is atomicity: a rejected or failed transaction leaves no partial transaction, allocation or balance effect. Agreed for Sprint 1:

- Amounts: THB only; a transaction or allocation amount is a decimal string greater than 0 with at most two decimal places, parsed exactly into integer satang (no rounding; more decimals are rejected). Maximum single amount 1,000,000,000.00 THB; store satang as `bigint`.
- Allocation: at least one allocation line; the allocation sum must equal the transaction total exactly. Every referenced account belongs to the acting User, and each allocation account type must be allowed for that form by the System SDS effect table. An allocation may not reference the primary account itself.
- No negative balances: a transaction is rejected (422) if it would make a Cash account balance below zero, or reduce a Loan Taken (debt) or Loan Given (receivable) balance below zero (no overpayment). The check runs inside the same database transaction as the write, against locked current balances.
- Atomic rejection: any validation, ownership or balance failure writes nothing; a persistence failure rolls back the whole request. The draft Sprint 1 journey uses only the documented salary, split card purchase and bank-to-card repayment cases.

## D-04 Dates, opening balances and correction boundary

Proposal: accept a calendar date in YYYY-MM-DD form; interpret reporting dates in Asia/Bangkok; use inclusive from/to dates in the UI and a clearly defined server comparison. Agreed: an opening balance is an amount greater than or equal to 0 with an opening date. A transaction date must be on or after the primary account's opening date and not later than the current date in Asia/Bangkok; future dates are rejected. The opening balance and date may be changed after activity exists, because balances are derived; the change is rejected if it would make any later balance negative or place an existing transaction before the opening date.

Proposal: Sprint 1 records the opening bank balance and permits new transactions; transaction correction is assigned to Sprint 2. Agreed: Sprint 1 creates transactions only, with no idempotency key; the UI disables submission while a request is in flight. Sprint 2 adds transaction correction by edit with derived balances recalculated (its contract is written then). Sprint 3 adds the duplicate feature. This deferral must not remove correction from the product baseline.

## D-05 Authentication and deactivation

Agreed Sprint 1 model: first-party stateless signed JWT in an HttpOnly cookie for seeded-user sign-in. The JWT carries the user identifier, display name and role snapshot plus standard issuer, audience, issue-time and expiry claims. Approved by Wisit: a 3600-second lifetime, HS256 as the fixed algorithm and the `jose` library. Agreed key handling: one HS256 key from the `JWT_SECRET` secret (at least 32 bytes, from the local `.env` or the deployment's secret store, never in Git). Rotation is manual: replace the secret and restart; all outstanding tokens become invalid at once and users sign in again, which the team accepts given the 3600-second lifetime. No previous key is retained. The exact request-protection mechanism (Origin/CSRF, including missing-`Origin` handling) remains open.

This simple design has no server-side session row, refresh token or revocation list. Logout clears the current browser cookie; a copied token remains valid until expiry. A role change or account disable does not affect an existing token before expiry while its signing key remains accepted; new sign-ins use the current user record. Do not claim immediate revocation or current-account checks on every request. Both students accept these limits; Wisit approved a 3600-second lifetime and HS256 with the `jose` library. Key rotation and request-protection details (Origin/CSRF, including missing-`Origin` handling) remain open and are recorded in D-05 before they are relied on. Change the design if immediate effect becomes necessary.

Use an adaptive one-way password hash from a trusted library, never reversible password encryption. Protect the JWT in an HttpOnly, SameSite=Lax cookie and enable Secure under HTTPS. Define signing-key rotation and retention. Validate signature, fixed algorithm, issuer, audience and expiry; protect cookie-authenticated writes against cross-site requests. Seeded identities are sufficient. Public signup, email delivery and password recovery are outside Sprint 1. This is the team's selected design, not a course requirement or an implementation result.

## D-06 Sprint 1 scope and feature ownership

Proposal: F-01 to F-06 provide login/logout, minimal enable/disable administration, reproducible bank/card/income/expense accounts, opening bank balance, salary receipt, a split credit-card purchase, bank-to-card repayment, and balances/summary/history. The approved baseline must still allocate all five account types and later correction/search/favourite/duplicate behavior across the three sprints.

Seeded financial accounts are permitted by the assignment's Sprint 1 example. The UI for managing every account type belongs to Sprint 2; creating the opening bank balance remains a Sprint 1 user action. Agreed: this boundary and the assignment in D-01.

## D-07 Public interfaces and verification

The System SDS and Sprint 1 contract define proposed route names, DTOs, error outcomes and ownership checks. Review those interfaces together before writing executable tests; change the contract first if a public interface changes. Expected financial results come from the independent fixture in the STS, not from the implementation's calculation helper.

Use unit checks for financial logic, API tests against an isolated real database for persistence/access/atomicity, and selected browser journeys for the required user workflow. A screenshot, a mock-only test or an AI claim is not proof of persistence or backend privacy. Actual test paths, results and red/green commits remain blank until executable tests exist and run.

## Agreement and revision record

| Decision | Agreed answer and rationale | Student confirmations / review link | Date / contract revision |
| --- | --- | --- | --- |
| D-01 remaining identifiers and work split | Sprint 1 split: F-01/F-02 Natthawat, F-03/F-04 Wisit, F-05/F-06 Natthawat; the other student reviews. Section remains open | Natthawat proposed; Wisit confirms by approving this PR (Issue #2) | 14 November 2026 |
| D-02 | Better T Stack selected; first-party stateless JWT selected for Sprint 1 seeded-user authentication; pins Bun 1.4.4 (`oven/bun:1.4.4`) and `postgres:18.4` | Natthawat authored PR #5; Wisit approved the stack; both students accepted the JWT limits recorded in PR #9 | 13 November 2026; D-02 update in PR #9; pins proposed 14 November 2026, confirmed by Wisit's approval of this PR (Issue #2) |
| D-03 | THB integer satang, 0 < amount ≤ 1,000,000,000.00, two decimals, exact allocation sum, owned and type-compatible accounts, no negative Cash/debt/receivable balances, atomic rejection | Natthawat proposed; Wisit confirms by approving this PR (Issue #1) | 14 November 2026 |
| D-04 | Opening ≥ 0 with date; transaction date between opening date and today (Asia/Bangkok); opening editable if no balance goes negative; correction S2, duplicate S3, no S1 idempotency | Natthawat proposed; Wisit confirms by approving this PR (Issue #1) | 14 November 2026 |
| D-05 | Stateless JWT; logout clears the current browser cookie only; copied tokens and old role/account state remain usable until expiry while the signing key is accepted. Approved: 3600-second lifetime, HS256 with `jose`. Key from `JWT_SECRET`; manual rotation invalidates all tokens; no previous key retained. Request-protection mechanism remains open. | Both students accepted the stated limits; PR #9 records the behavior | 13 November 2026; D-05 update in PR #9; lifetime and algorithm approved by Palapluem in the PR #10 and #12 reviews |
| D-06 | F-01 to F-06 Sprint 1 boundary with the D-01 assignment | Natthawat proposed; Wisit confirms by approving this PR (Issue #1) | 14 November 2026 |
| D-07 | Sprint 1 journey and expected values are the STS fixture (opening bank 10,000; salary 20,000; card purchase 1,200 split 700/500; repayment 500). Each feature's routes and DTOs follow the System SDS and are reviewed in that feature's PR before its tests | Natthawat proposed; Wisit confirms by approving this PR (Issue #1) | 14 November 2026 |

Draft preparation: 7 November 2026; status updated 12 November after PRs #5–#7. Track D-01, D-05 and the D-02 runtime/image pin in Issue #2; track D-03, D-04, D-06 and D-07 in Issue #1. Keep both Issues open until their actual completion conditions are met. PR #4 established the documentation baseline, PR #5 recorded the selected stack, and PR #6 added an auth/setup proposal. PR #7 was approved by Palapluem and merged into `sprint-1-staging` at `3e8bc5f` as a session-policy/API proposal; its choices still require team agreement. No implementation or product tests are claimed.
