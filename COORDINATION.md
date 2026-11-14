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
- Implementation status: PR #12 (F-01 identity, signed JWT) is approved by Palapluem and merged into `sprint-1-staging` (merge `ed9bf57`). Its repository PR CI passed on head `604b3be` (run 43549728162). PR #14 (F-02 backend administration) is approved and merged (merge `31c6a16`); `build-test` passed on its reviewed head. PR #10 (authentication documentation alignment) is approved and merged (merge `d7ae251`). PR #15 (Sprint 1 decisions for Issues #1/#2; Bun 1.4.4 and PostgreSQL 18.4 pin updates in package metadata, CI and the test-database script) is in review. F-02's UI is not built, so Issue #13 stays open. These are PR integration results, not main or release results.
- Decisions: Wisit approved a 3600-second token lifetime and HS256 with `jose`; both students accepted the stateless-JWT limits recorded in D-05. The D-05 key source, rotation/retention, and request-protection policy remain open; the course section is also unresolved. PR #15 proposes the D-02 runtime/image pins, D-01 work split, D-03/D-04 money and date policies, and D-06/D-07 scope and interface choices; all await Wisit's review/approval (see `docs/decisions.md`, Issues #1/#2). D-04 also needs a decision on whether allocation-account opening dates constrain transaction dates.
- Next bounded action: Wisit and Natthawat resolve the pending proposals and D-04 date edge case; update/review PR #15, then verify Issues #1/#2 completion criteria before closing either. Keep implementation work gated on the approved contract; the proposed split is Wisit F-03/F-04 and Natthawat F-05/F-06, with cross-review. The F-01/F-02 UI remains a separate follow-on.
- Checks: PR #15 updates engineering documents and pins Bun 1.4.4 in package metadata/CI plus PostgreSQL 18.4 in CI and `scripts/test-db.sh`. GitHub Actions run 43624623192 passed on head `de3931a`: type check passed; Biome checked 21 files with no fixes; integration tests passed (34 pass, 0 fail across 5 files) against PostgreSQL 18.4 using Bun 1.4.4. These are PR integration results, not `main` or release evidence. Local Docker execution, GCP deployment and the Lab 5 deployment pipeline are NOT RUN. Do not create a merge-record PR.
- Cleanup: the disposable local test database and its password file were removed after local runs. Keep only canonical documents in Git.
