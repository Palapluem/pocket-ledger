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

## Current documentation handoff: 13 November 2026

- Work: English engineering baseline, draft Sprint 1 contracts/STS, and the Lab 5 and Deliverable 1 report tabs. PR #4 (baseline), PR #5 (selected stack), PR #6 (auth/setup proposal), PR #7 (session proposal), PR #8 (status reconciliation) and PR #9 (first-party signed-JWT decision) are merged into `sprint-1-staging`. PR #9 was approved by Palapluem and merged by its author, N0TAW00D.
- Confirmed: LEB2 group name 2-Nor and the Better T Stack selection. The exact Bun/runtime and image versions, course section, money/date policies, JWT key rotation and request-protection (Origin/CSRF) details, interface approval and first implementation ownership remain open in `docs/decisions.md` and Issues #1/#2.
- Product documents: SRS, features, traceability, System SDS, sprint plan, Sprint 1 contract, STS and the auth/setup proposal. Keep requirements in the SRS, planning in the inventory/plan, decisions in one register, and actual test outcomes in the STS.
- Next bounded action: both students resolve the remaining Issue #1/#2 decisions, review the proposed interfaces, and assign a bounded implementer/reviewer pair before dependent implementation.
- Checks: documentation review only. Application suites, database, servers, Docker execution, GCP deployment and product release are NOT RUN/not established. No accepted Sprint 1 release exists.
- Review and release: PR #4 was approved by N0TAW00D; PRs #5, #6, #7 and #9 were approved by Palapluem; the process rule is that the teammate approves and merges each PR. PR #9 recorded the JWT limits both students accepted. Wisit approved a 3600-second token lifetime and HS256 with `jose`; key rotation and request-protection details (including missing-`Origin` handling) remain open. PRs after #9 must be merged by the reviewer, not the author. No implementation or product tests are claimed. A later accepted sprint release reaches `main` through the normal reviewed release PR. Do not create a merge-record PR.
- Cleanup: no application server or test database was used for these documentation changes. Remove temporary review worktrees after the review task; keep only canonical documents in Git.
