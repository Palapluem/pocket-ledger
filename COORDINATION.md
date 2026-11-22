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

## Current handoff: 22 November 2026 (before the documentation release #41)

- Task: Lab 5 record of release #38 and C-05 after the second redeploy (Issue #17, closed). PR #39 merged at `8c28d5e`. PR #40 added before/after and full-browser screenshots and Wisit's identity and runbook updates; it merged at `cbad590`. Release PR #41 promotes this documentation to `main`.
- Release state: release PR #38 (approved and merged by N0TAW00D) put `main` at `37593da1cb3cd881e6b22845a2b4a929dbf6bc8e`. Its application code is identical to the Sprint 1 release `265c995`; it adds only the TEST-28 E2E wait (#37) and documentation. Deploy run 44885832231 (push digest `sha256:d105b5a2…`, migration execution `pocket-ledger-migrate-wv8tl`) serves it as revision `pocket-ledger-00004-hxk` at 100% traffic. Register: `docs/releases.md`.
- Checks: release PR `build-test` runs 44885196777 and 44885428585 on `f7974a2`; main CI 44885832238 passed on `37593da`; the deploy smoke checks passed. C-05 after the second redeploy: `verify … after-redeploy-2 37593da…`, `RESULT: PASS (14/14 checks)` (`docs/labs/lab-05/evidence/run-summaries.md`). TEST-27 was not repeated on `37593da`; it passed on `265c995`, which has the same application code. On 22 Nov a supplementary 450.00 synthetic charge was saved for the full-browser C-04 screenshots. The synthetic User's summary therefore no longer matches the C-05 baseline (`c05-record.json`). All recorded C-05 results predate the charge. A future persistence check needs a new baseline in a fresh evidence directory (`deployment.md`, release procedure step 1).
- Decisions and issues: D-01 to D-07 accepted; D-05 Origin/CSRF protection deferred (PR #24 closed unmerged). `build-test` is required on `main` and `sprint-1-staging`. Issue #2 remains open. The time-zone-naive `created_at` is known but not yet filed.
- Remaining action: merge release PR #41 into `main` after review; a documentation-only push does not redeploy. Arrange Lab 6 independent partner UAT. Add PRs #29–#42 to the project board and assemble the PD1 PDF (A–F page ranges) in the course report.
- Cleanup: no server, database, container or worktree is held for this task. Raw run logs stay outside Git.
