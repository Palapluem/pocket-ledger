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
| D-02 Stack and reproducible runtime | Wisit + Natthawat | STACK CONFIRMED; PINNED RUNTIME/IMAGE VERSION OPEN | System SDS, setup and implementation |
| D-03 Money, balance signs and account compatibility | Wisit + Natthawat | PROPOSED | Financial contracts and expected values |
| D-04 Dates, opening balances and correction boundary | Wisit + Natthawat | PROPOSED | History, summaries and validation |
| D-05 Authentication and deactivation | Wisit + Natthawat | PROPOSED | Identity, authorization and administrator contract |
| D-06 Sprint 1 scope and feature ownership | Wisit + Natthawat | PROPOSED | Sprint plan and implementation Issues |
| D-07 Public interfaces and verification | Wisit + Natthawat | PROPOSED | API/data/UI contract and STS |

## D-01 Team identifiers and rotating work

LEB2 group name is 2-Nor. Section and any separate team number remain blank in the report identity table until confirmed. Repository access for N0TAW00D was verified as write access on 7 November; this is access evidence, not a completed contribution.

Both students must participate in design, tests, implementation, agent supervision, review and delivery. Assign bounded features or checks, then rotate. The suggested first work split is an identity/access slice and a financial-transaction slice, with the other student reviewing each. Neither implementer nor reviewer has been assigned yet. Pair work must name both participants in the relevant Issue or PR.

## D-02 Stack and reproducible runtime

The team selected Better T Stack with TanStack Router, Elysia, Bun, Better Auth, PostgreSQL, Drizzle ORM, Docker database setup and Docker web/server deployment. API add-ons and payments are disabled. Use Bun as the package manager, Biome for formatting/linting, Husky for local Git hooks, and Turborepo for workspace orchestration. No example features are included. Wisit confirmed this selection in the review of PR #5 on 12 November 2026. A reproducible exact Bun/runtime and image-version choice remains open.

The repository is a single product workspace. Keep the frontend and Elysia backend in that workspace, with PostgreSQL as the persistent relational store and Drizzle as its schema/migration/query layer. Better Auth supplies authentication; the product's role and ownership authorization remain application responsibilities. Docker is the local database and deployment packaging target. Keep local development, CI and container images on the same pinned Bun version. Resolve the actual template output, supported versions, environment variable names, scripts and container topology during setup; do not infer them from the generator name. No cloud resource is established by this decision.

## D-03 Money, balance signs and account compatibility

Proposal for Sprint 1: one currency, THB; positive transaction amounts with at most two decimal places; integer satang for arithmetic and storage; no implicit rounding. Agree a maximum amount within the selected database/integer limits before coding. Opening-balance signs and overdraft/overpayment behavior need an explicit answer; they are not inferred from the positive-transaction rule.

Proposed normal balances: Cash is money held; Loan Given is money receivable; Loan Taken is debt owed; Income and Expense record their respective classifications. The effect table in the System SDS makes each sign explicit. All referenced financial accounts must belong to the acting User. An Administrator never gains financial access. The two required transaction forms and their assignment-defined allocation categories must remain supported by the product baseline.

The required property is atomicity: a rejected or failed transaction leaves no partial transaction, allocation or balance effect. Agree invalid same-account combinations, insufficient-funds policy, overpayment and mixed allocation cases before their implementation. The draft Sprint 1 journey uses only the documented salary, split card purchase and bank-to-card repayment cases.

## D-04 Dates, opening balances and correction boundary

Proposal: accept a calendar date in YYYY-MM-DD form; interpret reporting dates in Asia/Bangkok; use inclusive from/to dates in the UI and a clearly defined server comparison. Agree whether future-dated transactions are allowed, the opening date relative to transactions, and whether an opening balance can be changed after activity exists.

Proposal: Sprint 1 records the opening bank balance and permits new transactions; transaction correction is assigned to Sprint 2. The correction method (edit with recomputation, or reversal/replacement) remains undecided until that contract is written. This deferral must not remove correction from the product baseline.

## D-05 Authentication and deactivation

Proposal: server-issued opaque sessions in an HttpOnly cookie; persist only a hash of the session token; use an explicit configurable expiry; logout revokes the current session. Every protected request checks the current identity, role and enabled state. Disabling a user rejects existing sessions on their next request and prevents login. Agree expiry and any self/last-administrator safeguards before implementation.

Seeded demonstration identities are sufficient for Sprint 1. Password hashing, valid/invalid login, logout, current-user identity, User/Administrator separation and backend ownership checks are required. Self-registration, email delivery and password recovery are outside Sprint 1.

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
| D-02 | Better T Stack selected; exact Bun/runtime and image tags remain to pin | Natthawat authored PR #5; Wisit reviewed and approved it | 12 November 2026; System SDS 0.2 |
| D-03 | | | |
| D-04 | | | |
| D-05 | | | |
| D-06 | | | |
| D-07 | | | |

Draft preparation: 7 November 2026; status updated 12 November after PRs #5 and #6. Track D-01, D-05 and the D-02 runtime/image pin in Issue #2; track D-03, D-04, D-06 and D-07 in Issue #1. Keep both Issues open until their actual completion conditions are met. PR #4 established the documentation baseline, PR #5 recorded the selected stack, and PR #6 added an auth/setup proposal; none approves the unresolved policies or claims an implemented product.
