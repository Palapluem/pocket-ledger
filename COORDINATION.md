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

## Current documentation handoff: 7 November 2026

- Work: English engineering baseline, draft Sprint 1 contracts/STS, and correction of the two course-report tabs. Consolidated in existing PR #4 on docs/3-product-documentation-english, based on sprint-1-staging; no implementation or extra PR is started.
- Confirmed by the student: LEB2 group name 2-Nor. Stack and money proposals are not yet agreed. Section and implementation ownership remain open in docs/decisions.md.
- Product documents: SRS, features, traceability, System SDS, sprint plan, Sprint 1 contract and STS. Keep requirements in the SRS, planning in the inventory/plan, decisions in one register, and actual test outcomes in the STS.
- Next bounded action: both students resolve applicable Issue #1/#2 decisions, review the draft contract/interfaces, and assign the first implementer/reviewer before code.
- Checks: documentation consistency/link/ID coverage only. Product suites, database, servers and cloud are NOT RUN/not created. No accepted release exists.
- Review and release: the teammate reviews/merges PR #4 into staging; a later accepted sprint release reaches main through the normal reviewed release PR. Do not create a merge-record PR.
- Cleanup: no application server, test database or implementation worktree belongs to this documentation task. Retain only canonical documents and the two corrected report drafts.
