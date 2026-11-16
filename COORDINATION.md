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

## Current handoff: 16 November 2026

- Work: reconcile current Sprint 1 status and perform TEST-27 from a clean checkout. PRs #18, #19, #22, #23 and #25 are integrated into `sprint-1-staging` at `53c20ff`; PR #25 was approved by N0TAW00D before merge. These are staging results, not an accepted release.
- Verification: exact-head GitHub Actions run #59 passed on PR #25 head `420c6bd` (125 server tests / 518 assertions across 14 files, 11 browser E2E tests, type checks, Biome, web build and production Docker image build). Clean-checkout TEST-27 passed on merge SHA `53c20ff`; the setup, seed idempotence, build, local test counts, smoke checks and cleanup are recorded in `docs/sprints/sprint-1/tests.md`.
- Decisions and issues: D-01 to D-07 are accepted. Issues #20 and #21 are closed. Issue #2 remains open for the unconfirmed course section and Lab 5 setup details; Issue #17 tracks Lab 5 deployment. Issue #26 tracks this bounded documentation reconciliation. PR #24 is a separate open D-05 Origin/CSRF proposal; request protection remains deferred. Do not claim a GCP deployment.
- Current release gate: `main` remains bootstrap `a4cced2`. A reviewed staging-to-main release, checks on the exact release commit, final Part F evidence, report navigation and the self-contained PD1 PDF remain outstanding. The saved handout deadline and the student-reported 15 November cutoff have passed; no later extension is verified.
- Next bounded action: finish and peer-review the single Issue #26 documentation PR into `sprint-1-staging`. After merge, run integration/acceptance checks and open one reviewed release PR from staging to `main`; the teammate reviews and merges it. Then complete release-matched evidence and the report. Lab 5 deployment work is separate.
- Cleanup: the disposable PostgreSQL container/database, server process and temporary toolchain/browser cache used for TEST-27 were removed after verification. The clean-check worktree is retained solely for the Issue #26 documentation PR and will be removed after the branch is pushed. Do not touch the existing user worktrees `/private/tmp/pocket-ledger-20` or `/private/tmp/pocket-ledger-20-reconcile`.
