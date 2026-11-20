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

## Current handoff: 20 November 2026

- Work: Sprint 1 accepted release and the Lab 5 evidence. Release PR #32 (reviewed and merged by Palapluem) put `main` at `265c99596dd55f3ab91f5ea3db7632df05ab5a65`. Deploy run 44563996620 serves it as Cloud Run revision `pocket-ledger-00003-5rh`. The release register is `docs/releases.md`.
- Verification: clean-checkout TEST-27 on `265c995` passed: 131 server tests / 534 assertions across 15 files, 13 E2E tests, seed idempotent, production-server smoke, and the Theme 7 journey with Administrator 403 and logout 401 (`docs/sprints/sprint-1/tests.md`). Lab 5 C-01 to C-06 are recorded in `docs/labs/lab-05/deployment.md`; C-02 was recorded by #35 (merged).
- Decisions and issues: D-01 to D-07 accepted. D-05 Origin/CSRF request protection remains deferred (PR #24 closed unmerged). `build-test` has been a required check on `main` and `sprint-1-staging` since 19 Nov. Issue #17 closes after #35 and the final Lab 5 doc update. Issue #2 remains open.
- Current release gate: PD1 needs the report navigation (A–F page ranges) and the self-contained PDF, assembled by Palapluem in the course report from the Part F evidence. Documentation-only pushes to `main` do not redeploy (`deploy.yml` `paths-ignore`).
- Next bounded action: merge this documentation PR into staging (#35 is merged), then promote it in one reviewed docs-only release PR (no redeploy). Assemble the PD1 PDF.
- Cleanup: the disposable PostgreSQL container, the server process, the clean clone and the locally generated credentials used for TEST-27 and the Part F screenshots were removed. Raw run logs and screenshots stay outside Git.
