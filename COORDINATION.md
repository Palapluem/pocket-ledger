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

## Current handoff: 21 November 2026

- Task: PD1 Part F release evidence and the final Lab 5 record (Issue #17), in PR #36 (`docs/part-f-release-evidence` → `sprint-1-staging`). Documentation only.
- Base/head: base `sprint-1-staging` at `3694c67` (includes #35 C-02 and #37 TEST-28 wait fix), merged into the branch without rewriting history. Reviewed head before this update: `eea75ba`. This update changes only this handoff and the `docs/labs/lab-05/deployment.md` summary fields, public URL and known limitations.
- Release state: `main` is `265c99596dd55f3ab91f5ea3db7632df05ab5a65` (release PR #32), served by Cloud Run revision `pocket-ledger-00003-5rh` (deploy run 44563996620). A read-only `GET /api/health` on 2026-11-21T07:57Z reported that commit and `database: ok`. Register: `docs/releases.md`.
- Checks: `build-test` passed on `eea75ba` (run 44881028769). Clean-checkout TEST-27 on `265c995` (20 Nov): 131 server tests / 534 assertions across 15 files, 13 E2E tests, seed idempotent, production-server smoke and the Theme 7 journey (`docs/sprints/sprint-1/tests.md`). Lab 5 C-01 to C-06 are recorded in `docs/labs/lab-05/deployment.md`, including C-05 after redeploy (14/14).
- Review state: Palapluem requested changes on 21 Nov 07:56 UTC (the `deployment.md` pre-deployment placeholders and this handoff). This update addresses them; re-review is requested once `build-test` passes on the new head.
- Decisions and issues: D-01 to D-07 accepted; D-05 Origin/CSRF protection deferred (PR #24 closed unmerged). `build-test` is required on `main` and `sprint-1-staging`. Issue #2 remains open. The time-zone-naive `created_at` is known but not yet filed.
- Remaining action: Palapluem approves and merges #36. Then a staging → `main` release PR: since #37 changed `e2e/`, that push is not documentation-only and starts a Deploy run (needs the `production` approval), after which C-05 is rechecked against the new commit; alternatively that release waits. Then close Issue #17, add PRs #29–#37 to the project board, and assemble the PD1 PDF (A–F page ranges) in the course report.
- Cleanup: no server, database, container or worktree is held for this task. The TEST-27 disposable PostgreSQL container, server process, clean clone and generated credentials were removed on 20 Nov. Raw run logs and screenshots stay outside Git.
