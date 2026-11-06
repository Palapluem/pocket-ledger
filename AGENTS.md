# PocketLedger working rules

Read this file, `CONTRIBUTING.md`, `COORDINATION.md`, `GLOSSARY.md` and the relevant contract before changing the product.

## Identity and scope

- Product: PocketLedger; repository: `Palapluem/pocket-ledger`.
- Team: Wisit (`Palapluem`) and Natthawat (`N0TAW00D`).
- Theme 7's five account types, two transaction forms, allocation/balance rules and privacy boundary apply. An Administrator cannot access users' financial records or summaries.
- The enclosing CPE334 repository is a different Git root. Never stage this checkout there or copy product source into the course tree.
- Verify the intended root, remote and working-tree state before staging, committing or pushing. Preserve other people's work; isolate concurrent implementation in an agreed worktree.

## Documentation language

- Write product specifications, decision records, repository documentation, and GitHub Issue/PR text in clear, professional English. Keep Thai study notes and course-report content in the separate CPE334 course repository unless an assessment specifically requires otherwise.
- Preserve official names, technical identifiers, code, and quoted source wording when translating or editing documentation.

## Before implementation

- Resolve the applicable money/date/ownership decisions, then version the feature SDS, applicable UI/API/data details, stable AC, STS and DoD before its implementation.
- Actual specifications live under `docs/` once authored through the reviewed workflow. Preparation notes are not an approved contract.
- Do not select monetary precision, balance signs, correction policy or permission exceptions silently. Surface decisions that change observable results.
- Agree the public test interfaces before writing executable tests. Use independent expected values, real API/database integration for persistence/access and selected UI/E2E journeys.
- Work one bounded Issue at a time. Record meaningful red-before-green evidence for rule/defect/change work. Do not weaken, skip or disable required tests.

## Git and review

- The documentation-only initial bootstrap is the base; it contains no accepted implementation.
- Subsequent feature/fix/docs branches start from the current sprint staging branch. No development commits directly to `main` or sprint staging.
- The teammate provides a specific review and is the person who merges after approval. Do not approve or merge the author's own PR.
- Link PRs through the Issue/PR Development panel, especially when the base is staging. A keyword mention alone is not proof of a Development link.
- Keep corrections on the same branch/PR. Batch related documentation with its implementation.
- Integration checks precede the reviewed staging-to-main release. From Lab 5, required CI covers both staging and main PRs and failed checks block the release path.
- Preserve pushed commits, contract changes and CI history. No force push, rebase of published work, squash that removes required evidence, or PR chain just recording earlier merges.
- Never add AI-credit lines, AI authors, generated-by text or `Co-Authored-By` trailers to commits, PR bodies, Issues or comments. Maintain only the brief, truthful assessment tool-use declaration.

## Cloud and evidence

- Do not change billing, IAM or databases autonomously. Present the concrete command/change for the student's review under the Lab 5 instructions.
- Do not read or print secret values into chat, logs, screenshots, commits or reports. Commit placeholders only.
- Keep data durable outside application containers. Synthetic demo data must not overwrite existing financial activity when setup/seed is rerun.
- Use separate disposable test resources only when authorized, identify them before use and clean up owned resources afterward. Do not touch another task's servers/databases/worktrees.
- Record actual commands, file/test names, results and tested commits. Planned/unknown is not PASS; final evidence must match the final assessed version.
- Lab 6 requires an independent partner team. A teammate review or developer self-check is not independent UAT.
- Lab 7 requires instructor/TA approval for a change to implemented behavior; an unfinished baseline feature is not that exercise.
- Keep the repository public and the assessed deployment available through grading.

## Finishing a task

Inspect the diff and run checks appropriate to the actual change. Record what ran, what remains and how to continue in the coordination handoff. Clean temporary files and owned resources. Do not start unrelated work, open unnecessary PRs or claim a complete assessment from document preparation alone.
