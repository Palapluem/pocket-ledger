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
