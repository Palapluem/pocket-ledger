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
| D-01 Team identifiers and rotating work | Wisit + Natthawat | PARTIAL: group name confirmed; section and task allocation open | Submission identity and task ownership |
| D-02 Stack and reproducible runtime | Wisit + Natthawat | STACK CONFIRMED; FIRST-PARTY JWT SELECTED FOR SPRINT 1; RUNTIME/IMAGE PIN OPEN | System SDS, setup and implementation |
| D-03 Money, balance signs and account compatibility | Wisit + Natthawat | PROPOSED | Financial contracts and expected values |
| D-04 Dates, opening balances and correction boundary | Wisit + Natthawat | PROPOSED | History, summaries and validation |
| D-05 Authentication and deactivation | Wisit + Natthawat | JWT MODEL AGREED; 3600 s + HS256/jose APPROVED; KEY ROTATION AND REQUEST PROTECTION OPEN | Identity, authorization and administrator contract |
| D-06 Sprint 1 scope and feature ownership | Wisit + Natthawat | PROPOSED | Sprint plan and implementation Issues |
| D-07 Public interfaces and verification | Wisit + Natthawat | PROPOSED | API/data/UI contract and STS |

## D-01 Team identifiers and rotating work

LEB2 group name is 2-Nor. Section and any separate team number remain blank in the report identity table until confirmed. Repository access for N0TAW00D was verified as write access on 7 November; this is access evidence, not a completed contribution.

Both students must participate in design, tests, implementation, agent supervision, review and delivery. Assign bounded features or checks, then rotate. The suggested first work split is an identity/access slice and a financial-transaction slice, with the other student reviewing each. Neither implementer nor reviewer has been assigned yet. Pair work must name both participants in the relevant Issue or PR.

## D-02 Stack and reproducible runtime

The team selected Better T Stack with TanStack Router, Elysia, Bun, PostgreSQL, Drizzle ORM, Docker database setup and Docker web/server deployment. API add-ons and payments are disabled. Use Bun as the package manager, Biome for formatting/linting, Husky for local Git hooks, and Turborepo for workspace orchestration. No example features are included. Better Auth was included in the initial stack choice confirmed in PR #5 on 12 November 2026; on 13 November, the team selected first-party stateless JWT authentication for Sprint 1 seeded users, as recorded in this PR and the [auth/setup decision](sprints/sprint-1/auth-setup-proposal.md#selected-sprint-1-approach-first-party-signed-jwt). The exact Bun/runtime and image versions remain open.

The repository is a single product workspace. Keep the frontend and Elysia backend in that workspace, with PostgreSQL as the persistent relational store and Drizzle as its schema/migration/query layer. For Sprint 1, the application verifies signed JWT claims for seeded-user authentication; product role and ownership authorization remain application responsibilities. Docker is the local database and deployment packaging target. Keep local development, CI and container images on the same pinned Bun version. Resolve the actual template output, supported versions, environment variable names, scripts and container topology during setup; do not infer them from the generator name. No cloud resource is established by this decision.

## D-03 Money, balance signs and account compatibility

Proposal for Sprint 1: one currency, THB; positive transaction amounts with at most two decimal places; integer satang for arithmetic and storage; no implicit rounding. Agree a maximum amount within the selected database/integer limits before coding. Opening-balance signs and overdraft/overpayment behavior need an explicit answer; they are not inferred from the positive-transaction rule.

Proposed normal balances: Cash is money held; Loan Given is money receivable; Loan Taken is debt owed; Income and Expense record their respective classifications. The effect table in the System SDS makes each sign explicit. All referenced financial accounts must belong to the acting User. An Administrator never gains financial access. The two required transaction forms and their assignment-defined allocation categories must remain supported by the product baseline.

The required property is atomicity: a rejected or failed transaction leaves no partial transaction, allocation or balance effect. Agree invalid same-account combinations, insufficient-funds policy, overpayment and mixed allocation cases before their implementation. The draft Sprint 1 journey uses only the documented salary, split card purchase and bank-to-card repayment cases.

## D-04 Dates, opening balances and correction boundary

Proposal: accept a calendar date in YYYY-MM-DD form; interpret reporting dates in Asia/Bangkok; use inclusive from/to dates in the UI and a clearly defined server comparison. Agree whether future-dated transactions are allowed, the opening date relative to transactions, and whether an opening balance can be changed after activity exists.

Proposal: Sprint 1 records the opening bank balance and permits new transactions; transaction correction is assigned to Sprint 2. The correction method (edit with recomputation, or reversal/replacement) remains undecided until that contract is written. This deferral must not remove correction from the product baseline.

## D-05 Authentication and deactivation

Agreed Sprint 1 model: first-party stateless signed JWT in an HttpOnly cookie for seeded-user sign-in. The JWT carries the user identifier, display name and role snapshot plus standard issuer, audience, issue-time and expiry claims. Approved by Wisit: a 3600-second lifetime, HS256 as the fixed algorithm and the `jose` library. Signing-key rotation/retention and request-protection details (Origin/CSRF, including missing-`Origin` handling) remain open.

This simple design has no server-side session row, refresh token or revocation list. Logout clears the current browser cookie; a copied token remains valid until expiry. A role change or account disable does not affect an existing token before expiry while its signing key remains accepted; new sign-ins use the current user record. Do not claim immediate revocation or current-account checks on every request. Both students accept these limits; Wisit approved a 3600-second lifetime and HS256 with the `jose` library. Key rotation and request-protection details (Origin/CSRF, including missing-`Origin` handling) remain open and are recorded in D-05 before they are relied on. Change the design if immediate effect becomes necessary.

Use an adaptive one-way password hash from a trusted library, never reversible password encryption. Protect the JWT in an HttpOnly, SameSite=Lax cookie and enable Secure under HTTPS. Define signing-key rotation and retention. Validate signature, fixed algorithm, issuer, audience and expiry; protect cookie-authenticated writes against cross-site requests. Seeded identities are sufficient. Public signup, email delivery and password recovery are outside Sprint 1. This is the team's selected design, not a course requirement or an implementation result.

## D-06 Sprint 1 scope and feature ownership

Proposal: F-01 to F-06 provide login/logout, minimal enable/disable administration, reproducible bank/card/income/expense accounts, opening bank balance, salary receipt, a split credit-card purchase, bank-to-card repayment, and balances/summary/history. The approved baseline must still allocate all five account types and later correction/search/favourite/duplicate behavior across the three sprints.

Seeded financial accounts are permitted by the assignment's Sprint 1 example. The UI for managing every account type belongs to Sprint 2; creating the opening bank balance remains a Sprint 1 user action. The team must approve this boundary and assign the first implementer/reviewer before opening implementation Issues.

## D-07 Public interfaces and verification

The System SDS and Sprint 1 contract define proposed route names, DTOs, error outcomes and ownership checks. Review those interfaces together before writing executable tests; change the contract first if a public interface changes. Expected financial results come from the independent fixture in the STS, not from the implementation's calculation helper.

Use unit checks for financial logic, API tests against an isolated real database for persistence/access/atomicity, and selected browser journeys for the required user workflow. A screenshot, a mock-only test or an AI claim is not proof of persistence or backend privacy. Actual test paths, results and red/green commits remain blank until executable tests exist and run.

## Agreement and revision record

| Decision | Agreed answer and rationale | Student confirmations / review link | Date / contract revision |
| --- | --- | --- | --- |
| D-01 remaining identifiers and work split | | | |
| D-02 | Better T Stack selected; first-party stateless JWT selected for Sprint 1 seeded-user authentication; runtime/image pins remain open | Natthawat authored PR #5; Wisit approved the stack; both students accepted the JWT limits recorded in PR #9 | 13 November 2026; D-02 update in PR #9 |
| D-03 | | | |
| D-04 | | | |
| D-05 | Stateless JWT; logout clears the current browser cookie only; copied tokens and old role/account state remain usable until expiry while the signing key is accepted. Approved: 3600-second lifetime, HS256 with `jose`. Key rotation and request-protection details remain open. | Both students accepted the stated limits; PR #9 records the behavior | 13 November 2026; D-05 update in PR #9; lifetime and algorithm approved by Palapluem in the PR #10 and #12 reviews |
| D-06 | | | |
| D-07 | | | |

Draft preparation: 7 November 2026; status updated 12 November after PRs #5–#7. Track D-01, D-05 and the D-02 runtime/image pin in Issue #2; track D-03, D-04, D-06 and D-07 in Issue #1. Keep both Issues open until their actual completion conditions are met. PR #4 established the documentation baseline, PR #5 recorded the selected stack, and PR #6 added an auth/setup proposal. PR #7 was approved by Palapluem and merged into `sprint-1-staging` at `3e8bc5f` as a session-policy/API proposal; its choices still require team agreement. No implementation or product tests are claimed.
