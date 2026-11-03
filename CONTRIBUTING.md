# Working on PocketLedger

Both students participate in requirements/design, tests, implementation, supervision, review and delivery. Rotate responsibility by bounded work; equal commit counts are not required. Identify pair work in the Issue/PR.

## Work and branch lifecycle

1. Read the baseline and relevant contract. Open or take a bounded Issue with requirement/feature/AC IDs and completion evidence.
2. Add the Issue to the Project in Backlog. Move it to Specified only after understanding the requirements.
3. Create a branch from the current sprint staging branch; move only actively implemented work to Started.
4. Implement against the versioned contract and meaningful tests. Keep related documentation on the same branch.
5. Open a PR back into staging. Link it through Development, request the other teammate and move the linked card to PR Review.
6. If changes are requested or checks fail, move to Fixing, reply with the concrete fix/reason and push to the same branch. Return to PR Review when ready.
7. The reviewer approves only after checking behavior, assertions, diff and actual results, then merges. Move the card to Done and close the Issue only when its AC are satisfied.
8. Integrate the sprint and run the system/acceptance checks. Open a release PR from staging to `main`; the teammate reviews and merges.

The six board statuses are **Backlog → Specified → Started → PR Review → Fixing → Done**. A card in Done is not proof of a deployed release: link the accepted main release and deployment separately.

## Branches and commits

- Current integration branch: `sprint-1-staging`.
- Examples: `feature/<issue>-<topic>`, `fix/<issue>-<topic>`, `test/<issue>-<topic>`, `docs/<issue>-<topic>`, `ci/<issue>-<topic>`.
- Create Sprint 2/3 staging from the appropriate accepted baseline when those sprints begin; do not create stale future branches in advance.
- Use concise messages such as `test: reject mismatched allocation totals` or `fix: preserve ownership when reading transactions`. Preserve meaningful contract/test/implementation order.
- Never add AI-credit trailers, change pushed history or bypass required review/checks.

## Documentation changes

While a feature PR is open, its contract, tests and explanation belong in that same PR. After merge, batch necessary documentation corrections into one coherent reviewed change. Even a small product-doc edit follows the branch/PR workflow.

Do not open a follow-up PR solely to state that the prior PR merged. Main SHA, merge records, pipeline outputs and image/revision metadata already establish the release. Course PDF assembly or formatting alone belongs in the course repository.

## Linking and closing Issues

Verify the actual Development link on the PR/Issue and its number on the card. For staging-targeted PRs, `Closes #...` alone may be only a mention. Branch links are optional and do not replace PR links.

Merging to non-default staging does not necessarily close the Issue. After the reviewed merge and satisfied AC, update the card and close it explicitly when appropriate. Cloud-console work still has an Issue and safe evidence even when no code branch is involved.

## Verification

Before a PR, inspect the complete diff and run the checks justified by the change. Record actual commands, counts, file/test names, versions and failures/skips. Keep raw evidence local or in appropriate workflow artifacts; publish only safe evidence required for review.

From Lab 5, meaningful build/test CI must run on both integration and release PRs. A documentation check alone does not satisfy application CI. Required-check names are configured only after real jobs run; a deliberately failing temporary proof PR must never be merged.

## Releases and assessments

Keep the accepted Sprint 1 and Sprint 2 releases identifiable even when later work is integrated. Test and deploy the final assessed version; old green results establish history, not final correctness. Record commit → image → running revision and retain independent UAT/re-tests after affected fixes.

See [the assessment plan](docs/assessment-plan.md) for scope, deadlines and the report/evidence split. Keep real credentials and private user financial data out of the public repository and reports.
