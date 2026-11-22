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

## Current handoff: 22 November 2026 (after PR #40 and review of release PR #41)

- Task: finish Lab 5 evidence/status closeout without changing application code. Issue #17 is closed and its Project #3 card is Done. PRs #39 and #40 were reviewed and merged into sprint-1-staging. Project #3 tracks Lab 5 PRs #29–#43 with the lab5 label; PR #42 is closed in favor of #43. Cards: #29–#40 and #42 Done, #41 Fixing, #43 PR Review.
- Release state: main remains 37593da1cb3cd881e6b22845a2b4a929dbf6bc8e; it serves revision pocket-ledger-00004-hxk at 100% traffic. The pre-follow-up staging head is cbad590d21feb368d8612da7a3590425558a2681. Release PR #41 targets main; its build-test passed on cbad590 (run #45001329889). N0TAW00D requested status-text changes on 22 November, so #41 is not ready to merge.
- Deployment and evidence: deploy run #44885832231 records the image digest and current revision. C-05 after the second redeploy passed 14/14 on 37593da. PR #40 also adds supplementary full-browser C-04 captures of a synthetic 450 THB charge; this changes the synthetic user's summary, so a future C-05 record run needs a fresh baseline before restart/redeploy.
- Decisions: D-01 to D-07 are accepted; team 2-Nor (TH-013_P7), Section 1 (regular program), is confirmed. D-05 Origin/CSRF policy remains deferred; PR #24 was closed unmerged and the limitation is disclosed for the current public deployment. Issue #2 remains open. The time-zone-naive created_at is known and not yet filed.
- Docs follow-up: branch docs/17-lab5-release-status (base sprint-1-staging at cbad590), PR #43 to sprint-1-staging. N0TAW00D approved commit 5a4d29a and suggested three final refinements; they are incorporated in the current PR head. Request a fresh review after its required build-test passes. Documentation-only; no product, database, GCP resource, IAM or credential changes.
- Remaining: N0TAW00D reviews and merges PR #43 into staging, then re-reviews and merges release PR #41. Independent partner UAT/acceptance for Lab 6 remains pending, due 22 November 2026 at 23:59 +07. The self-contained PD1 PDF is prepared in the course repository; this product repository does not track LEB2 submission, which remains the student's action.
- Cleanup: no server, database, container, or worktree is held for the release review. Raw run logs stay outside Git.
