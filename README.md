# PocketLedger

PocketLedger is a personal finance application for tracking financial accounts, allocated transactions, balances and debt. It is the CPE334 group product for Wisit Suwannao and Natthawat Primsirikunawut, based on Theme 7: Personal Money and Expense Logging System.

**Current stage: repository and engineering preparation.** Application implementation, automated product tests, accepted sprint releases and cloud deployment have not started. A document template or planned check is not passing execution evidence.

## Product scope

The baseline covers Cash, Loan Given, Loan Taken, Income and Expense accounts; opening balances; payments/charges and received money with allocation lines; balances, debt, income/expense summaries and history; account management, transaction correction, favourites and editable duplicates.

Transfers, borrowing, loan repayments and opening balances must not be counted as income or expenses. Each transaction's allocation lines must equal its total and produce the correct related balances.

Users access their own financial data. Administrators manage platform user accounts and access, including enabling/disabling users, and cannot view or modify users' financial records or summaries. Period/shared budgets, automatic recurring transactions and bank integration are outside the supplied theme.

## Start here

- [Team and assessment identity](docs/team.md)
- [Engineering and delivery plan](docs/assessment-plan.md)
- [Decisions before implementation](docs/wayfinder/map.md)
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

There is no application runtime or selected stack in this bootstrap. Record the team's stack decision, money/date rules and Sprint 1 contracts before implementing features. The first implementation change must supply the actual dependency, environment, database migration/seed, run, build and test commands here.

Do not run the TokTickIT example deploy scripts against a cloud project without adapting them and reviewing every resource, permission and database operation. The reference kit remains in the [course Lab 5 folder](https://github.com/Palapluem/cpe334-software-engineer-2026/tree/main/labs/Lab05).

## Assessment sources

The [course project index](https://github.com/Palapluem/cpe334-software-engineer-2026/blob/main/project/README.md) links the master specification and Deliverable 1, Deliverable 2 and Final handouts. Lab 5 has a detailed handout. The local Lab 6/7 folders contained no detailed handouts at setup; their preparation currently follows master §10 and must be reconciled when those handouts arrive.

Final-video duration is unresolved in the supplied Final handout: §2 says at most 10 minutes, while §3.5 says maximum 4 minutes. Obtain instructor clarification; a shorter planning target does not resolve the source conflict.
