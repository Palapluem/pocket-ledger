# Coordination and handoff

Use this file for the shared working process. Keep ephemeral locks, private credentials and raw run logs outside Git; no lock is needed for read-only document review.

## Before taking work

1. Read the relevant Issue, contract and open decisions; check GitHub and local branch state rather than trusting an old snapshot.
2. Agree ownership of a bounded task and files/interfaces that overlap another task.
3. For implementation/test work that may interfere, use an owned worktree and record its base/head, ports, database/resource names and owner in the private task note before starting services.
4. Do not run two tasks against the same writable test database or have two agents edit the same checkout concurrently.

The bootstrap has no application server, test database or product test results. Future task notes must record actual resources instead of copying example names.

## Handoff format

- Task and linked Issue/contract.
- Base/head and current branch; exact commits pushed, if any.
- Changes and decisions, including approved scope revisions.
- Checks: command, file/test names, actual result/counts, tested commit; clearly mark NOT RUN/PARTIAL.
- Findings, remaining decisions, blockers and the next bounded action.
- Review/release status verified from GitHub.
- Cleanup: owned servers, database, worktree and temporary files; name anything intentionally retained.

A handoff is a progress record, not a release approval. Update a status only when its evidence exists. Do not manufacture work or extra PRs to make the handoff appear complete.

## Current handoff: 15 November 2026

- Work: English engineering baseline, draft Sprint 1 contracts/STS, and the Lab 5 and Deliverable 1 report tabs. PR #4, #5, #6, #7, #8 and #9 are merged into `sprint-1-staging`. PR #9 was approved by Palapluem and merged by its author, N0TAW00D. Later PRs are merged by the reviewer, not the author.
- Implementation status: PR #12 (F-01 identity backend) merged into `sprint-1-staging` at `ed9bf57`; its CI passed on head `604b3be` (run 43549728162). PR #14 (F-02 administration backend) merged at `31c6a16`; PR #10 (authentication documentation alignment) merged at `d7ae251`. PR #15 merged at `98afb3b`, recording the accepted D-01 to D-07 decisions and PostgreSQL 18.4 CI/test-database pin. Issues #11 and #13 remain open for the remaining F-01/F-02 scope; their user interfaces are not built. These are staging integration results, not main or release results.
- Decisions and issues: D-01 to D-07 are accepted as recorded in `docs/decisions.md`. Issue #1 is closed after the decision baseline was reviewed and integrated. Issue #2 remains open for the unconfirmed course section and Lab 5 container/deployment details; Issues #11 and #13 remain open for the unfinished F-01/F-02 scope. D-04 uses the opening date of every balance-bearing account involved; Income/Expense classifications impose no opening-date cutoff. Sprint 1's no-idempotency retry limitation is accepted. D-05 key handling is agreed; Origin/CSRF policy is deferred until deployment review.
- Next bounded action: start the accepted F-03/F-04 work with Wisit and F-05/F-06 with Natthawat, with cross-review, while tracking the F-01/F-02 UI follow-on and Issue #2's remaining metadata/deployment items. No accepted application release exists on `main`; `main` remains bootstrap `a4cced2`.
- Checks: PR #15 GitHub Actions run 43637769801 passed on head `04aecea`: 34 server tests, type check and Biome against PostgreSQL 18.4 using Bun 1.4.4. This is a PR/staging result, not `main` or release evidence. Local Docker execution, GCP deployment, Lab 5 C-02 failed-check proof and the Lab 5 deployment pipeline are NOT RUN. No merge-record PR is needed.
- Cleanup: the disposable local test database and its password file were removed after local runs. Keep only canonical documents in Git.
