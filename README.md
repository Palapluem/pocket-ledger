# PocketLedger

PocketLedger is a personal finance application for tracking financial accounts, allocated transactions, balances and debt. It is the CPE334 group product for Wisit Suwannao and Natthawat Primsirikunawut, based on Theme 7: Personal Money and Expense Logging System.

**Current stage (21 November 2026): the Sprint 1 increment F-01–F-06 is integrated on `sprint-1-staging` at `53c20ff`.** PR #25 for Issue #20 was approved by N0TAW00D and merged at that commit; CI #59 passed on its PR head `420c6bd` (125 server tests / 518 assertions across 14 files, 11 browser E2E tests, type checks, Biome, web build and production Docker image build). A separate clean-checkout TEST-27 run on `53c20ff` also passed local setup, migration, seed, build, server tests, browser tests and smoke checks; details are in the STS. These are the feature-level staging results. Since 19 Nov, the accepted Sprint 1 release on `main` is `265c995` (release PR #32, deployed to Cloud Run; register in `docs/releases.md`), and release-matched TEST-27 passed on it on 20 Nov. Release PR #38 then advanced `main` to `37593da`, which deploys the same application code with only a TEST-28 test fix and documentation (`docs/releases.md`). The PD1 PDF is still outstanding. The course section remains unconfirmed. Origin/CSRF policy remains deferred in the separate open proposal PR #24. LEB2 group name is **2-Nor**.

## Product scope

The baseline covers Cash, Loan Given, Loan Taken, Income and Expense accounts; opening balances; payments/charges and received money with allocation lines; balances, debt, income/expense summaries and history; account management, transaction correction, favourites and editable duplicates.

Transfers, borrowing, loan repayments and opening balances must not be counted as income or expenses. Each transaction's allocation lines must equal its total and produce the correct related balances.

Users access their own financial data. Administrators manage platform user accounts and access, including enabling/disabling users, and cannot view or modify users' financial records or summaries. Period/shared budgets, automatic recurring transactions and bank integration are outside the supplied theme.

## Start here

- [Team and assessment identity](docs/team.md)
- [Engineering and delivery plan](docs/assessment-plan.md)
- [Team decisions and unresolved policies](docs/decisions.md)
- [SRS and product scope](docs/srs.md)
- [Feature inventory](docs/features.md) and [requirements traceability](docs/traceability.md)
- [System-Level SDS](docs/system-sds.md)
- [Three-sprint plan and rotating work](docs/sprints/plan.md)
- [Sprint 1 feature contracts](docs/sprints/sprint-1/contract.md) and [STS/results](docs/sprints/sprint-1/tests.md)
- [Authentication and setup decision](docs/sprints/sprint-1/auth-setup-proposal.md) — records the agreed JWT model and key handling; Origin/CSRF request protection is deferred until deployment review
- [Financial vocabulary](GLOSSARY.md)
- [Contribution and release workflow](CONTRIBUTING.md)
- [Coordination and handoff](COORDINATION.md)
- [Release evidence register](docs/releases.md)
- [AI-use declaration](docs/ai-use.md)

Assessment working records:

- [Lab 5 deployment template](docs/labs/lab-05/deployment.md)
- [Lab 6 UAT preparation and execution record](docs/labs/lab-06/uat.md)
- [Lab 7 approved change, metrics and retrospective record](docs/labs/lab-07/change-and-metrics.md)

## Repository boundaries

This is the independent product repository at `Palapluem/pocket-ledger`. Its local checkout is:

```text
/Users/wisitsuwannao/Documents/Workspace/cpe334-software-engineer-2026/project/pocket-ledger
```

The enclosing [course repository](https://github.com/Palapluem/cpe334-software-engineer-2026) ignores this entire directory. Course handouts, study notes, preparation and submitted PDFs stay there; authoritative product specifications, application source, tests, migrations and delivery configuration belong here. This checkout is not a Git submodule.

## Engineering workflow

The initial documentation-only bootstrap establishes a base branch; it is not an accepted Sprint 1 release. Subsequent changes use:

```text
Issue + reviewed contract
  -> feature/fix/docs branch from sprint-1-staging
  -> tests + substantive teammate review
  -> reviewer merges into sprint-1-staging
  -> integration and acceptance checks
  -> reviewed release PR into main
  -> main release and, from Lab 5, repeatable deployment
```

Use later sprint staging branches when those sprints begin. Keep related documents in the same change. Preserve contract revisions and red/green evidence; do not create follow-up PRs merely to record the preceding merge SHA.

## Running the application

The team selected Better T Stack with TanStack Router, Elysia, Bun, PostgreSQL and Drizzle ORM. Docker is selected for local database setup and web/server packaging; Biome, Husky and Turborepo are included. API add-ons, payments and examples are disabled. Sprint 1 seeded-user authentication uses a first-party signed JWT instead of Better Auth. See [D-02](docs/decisions.md#d-02-stack-and-reproducible-runtime) and the [System SDS](docs/system-sds.md). On `sprint-1-staging`, the integrated app contains the F-01–F-06 UI/API/database journey. Bun 1.4.4 and PostgreSQL `18.4` are the agreed active pins. PR #15 applies PostgreSQL 18.4 in CI and `scripts/test-db.sh`. `main` (`37593da`, the Sprint 1 application code of release `265c995`) is deployed to Cloud Run; the container and GCP evidence is in `docs/labs/lab-05/deployment.md`.

Do not run the TokTickIT example deploy scripts against a cloud project without adapting them and reviewing every resource, permission and database operation. The reference kit remains in the [course Lab 5 folder](https://github.com/Palapluem/cpe334-software-engineer-2026/tree/main/labs/Lab05).

## Assessment sources

The [course project index](https://github.com/Palapluem/cpe334-software-engineer-2026/blob/main/project/README.md) links the master specification and Deliverable 1, Deliverable 2 and Final handouts. Lab 5 has a detailed handout. The local Lab 6/7 folders contained no detailed handouts at setup; their preparation currently follows master §10 and must be reconciled when those handouts arrive.

Final-video duration is unresolved in the supplied Final handout: §2 says at most 10 minutes, while §3.5 says maximum 4 minutes. Obtain instructor clarification; a shorter planning target does not resolve the source conflict.
