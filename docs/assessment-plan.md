# Engineering and delivery plan

This plan covers one continuous PocketLedger product across all three sprints and six assessments. It is preparation, not an approved SRS or evidence that any workflow has been implemented.

## Sources and open source questions

The [course project index](https://github.com/Palapluem/cpe334-software-engineer-2026/blob/main/project/README.md) contains the supplied PDFs. Use each detailed assessment handout for its required submission content:

- Master Group Work Specification: whole-product Theme 7, two-person participation, three-sprint model, Git/SDD/TDD and Labs 6/7 overview.
- Deliverable 1: complete A–E engineering content plus selected F execution/process evidence inside one self-contained PDF.
- Deliverable 2: complete current baseline and Sprint 2/3 contracts/status plus a deployed integrated candidate inside one self-contained PDF.
- Final Delivery: complete final engineering documents, final-version verification, independent UAT/re-tests and a separately submitted demonstration video.
- Lab 5: R-01–R-12, C-01–C-06 and a concise Answer Part 0–4 evidence index.
- Workflow Guide: six board statuses, actual Development links, reviewer merges, fixes on the same PR and documentation review.

The master is labelled draft and references to a master DOCX have no supplied DOCX counterpart. The detailed Lab 6/7 handouts are not present as of setup on 3 November 2026; do not invent their submission filename, exact headings or later rubric changes.

The Final PDF has an internal video-duration conflict: §2 says at most 10 minutes; §3.5's scored Part E says maximum 4 minutes. The master also differs in its video/release-summary point split. Seek instructor clarification and retain the answer; do not present either duration as unanimously confirmed.

## Milestones and current state

All times below are Asia/Bangkok. Later work must retain the same team, repository, application and GCP delivery environment.

| Assessment | Due | Points / course weight | Completion gate | Current state |
| --- | --- | --- | --- | --- |
| Deliverable 1 | 8 Nov 2026, 23:59 | 80 / 8% | Accepted, tested local Sprint 1 on main; PDF A–F complete | Preparation; no application release |
| Lab 5 | 15 Nov 2026, 23:59 | 100 / 5% | Docker, public GCP workflow, durable data, required CI and repeatable release | Not executed |
| Lab 6 | 22 Nov 2026, 23:59 per master | 100 / 5% | Independent UAT, legitimate defect handling and independent re-test | Await detailed handout / deployed release |
| Deliverable 2 | 29 Nov 2026, 23:59 (handout §4) | 70 / 7% | All Sprint 2 complete; meaningful tested Sprint 3 progress; deployed candidate | Not started |
| Lab 7 | 29 Nov 2026, 23:59 per master | 100 / 5% | Approved change to implemented behavior, red/green and regression-safe release | Await detailed handout / approved change |
| Final Delivery | 13 Dec 2026, 23:59 (handout §4) | 100 / 10% | Complete three-sprint product, final QA/UAT, deployed final version, PDF and video | Not started |

The final examination period is 1–11 December. By 29 November the product should be substantially complete; reserve the last period for bounded completion, defects and final verification rather than major missing workflows.

## Whole-product coverage and proposed sprint allocation

The table is a review starting point. Do not mark Sprint 2 complete by silently moving required scope into Sprint 3.

| Proposed feature | Sprint 1 foundation / vertical slice | Later baseline work |
| --- | --- | --- |
| F-01 Identity and access | Login/logout/current-user; User/Admin and backend ownership/access | Final security/regression against agreed NFR |
| F-02 Platform user administration | Meaningful minimal access-management behavior agreed by the team; no financial access | Remaining approved user-access operations |
| F-03 Accounts and opening balances | Reproducible bank/card/income/expense data and opening bank balance | Manage all five account types and opening balances |
| F-04 Receive money | Salary into bank with allocations and validation | Loan repayment received, borrowing and transfers |
| F-05 Payment or charge | Split card purchase and repayment from bank | Remaining payment, loans given and transfers |
| F-06 Balances, summaries and history | Correct bank/card/income/expense results and persisted history | Search/filter, category spending and reporting |
| F-07 Transaction correction | Policy specified before its implementation | Correct balances/history after approved corrections |
| F-08 Favourites and duplicate | Allocated to later sprint in the complete inventory | Favourite list and a distinct editable duplicate transaction |

Cover ownership on every referenced account and transaction path. Cash includes bank/wallet; card debt belongs to Loan Taken. Opening balances, transfers, borrowing and repayments do not become income or expenses. Amount precision/signs, date policy, correction behavior and retry rules remain in the [decision record](wayfinder/decisions.md).

Before implementing a feature, write its linked requirements, behavior/SDS, applicable UI/API/data details, AC, STS and DoD. Elaborate later features when needed; do not freeze every Sprint 3 endpoint before Sprint 1.

## Deliverable 1: baseline and accepted Sprint 1

| Part | Points | Required content |
| --- | ---: | --- |
| A | 10 | Complete SRS: actors, context, scope/exclusions, stable FR/BR and measurable NFR, assumptions/decisions |
| B | 10 | Complete feature inventory and requirement → feature/responsibility → sprint coverage |
| C | 15 | Complete system SDS: architecture/data/UI/API/access/auth/configuration/deployment design |
| D | 5 | Three-sprint goals, allocation, dependencies and outcomes |
| E | 20 | Every Sprint 1 feature contract with AC/STS/DoD and pre-implementation version history |
| F | 20 | Real normal journey and persisted retrieval; rule rejection; login/logout/access checks; tests/build; reviewed integration |

The Theme 7 example includes opening bank balance, salary, split credit-card dining/grocery purchase, bank-to-card repayment and resulting balances/debt/income/expense/history. Authentication alone or generic CRUD is insufficient. Demonstrate actual API/database integration and backend privacy, including Admin denial of financial data.

Part F includes two actual short automated-test excerpts (domain rule and role/ownership), meaningful red/green versions, two completed Issue/PR chains, final board/release, contributions and a brief AI-use declaration. No full prompt transcript, long reflection, separate video or GCP/Docker completion is required at this checkpoint.

## Lab 5: delivery foundation

Start from the accepted Sprint 1 release. Adapt the course starter kit rather than importing the TokTickIT application. Keep every app environment variable documented and no real secret in Git.

| Rubric | Points | Checks |
| --- | ---: | --- |
| CI and quality gate | 30 | C-01 normal PR build/tests; C-02 deliberately failing temporary PR blocked by required check |
| Docker/configuration | 20 | C-03 clean clone builds/runs with documented environment and database |
| GCP/persistence | 35 | C-04 live domain journey and rejection/access restriction; C-05 same record after restart and redeploy |
| Repeatable release | 15 | C-06 labelled Issue/reviewed staging+main PRs/CI/deploy/running commit |

Use `docs/labs/lab-05/deployment.md`. CI must cover staging and main PRs; the starter's main-only filter needs adaptation. The initial repository review protection is not evidence that application CI, required checks or C-02 have been completed.

Reference choices such as Cloud Run/Cloud SQL/WIF, digest deployment, separate migration job, smoke and rollback are recommended by the handout. Required behavior and evidence still apply if the team chooses differently. No autonomous billing/IAM/database changes; no prepayment/Upgrade under the supplied access instructions.

## Lab 6: independent acceptance and defects

Preparation currently follows master §10. Find a different two-person project team. Both teams prepare their own app's cases, execute the other app's cases and triage/fix/re-test their own app. Record an identified release and tester.

| Area | Points in master | Required outcome |
| --- | ---: | --- |
| UAT preparation/handoff | 20 | At least four executable user-facing cases, safe data/accounts, released version |
| Independent execution | 25 | Expected/actual, PASS/FAIL, tester, version and finding evidence on partner app |
| Defect reporting/triage | 20 | Reproduction, impact/severity and accepted/duplicate/not-defect/enhancement decision |
| Resolution/re-test | 35 | Accepted defect → regression red → fix → reviewed PR/CI/deploy → independent partner re-test |

Cases cover a normal journey, domain boundary/rule, role/ownership restriction and state/history/persistence. Use the [UAT record](labs/lab-06/uat.md). Resolve and independently re-test at least one legitimate accepted defect; if none exists, ask the TA for the controlled isolated exercise. Do not fabricate findings or substitute an enhancement.

## Deliverable 2: Sprint 2 complete and Sprint 3 progressing

| Part | Points | Required content |
| --- | ---: | --- |
| A | 5 | Original Sprint 1 still works; change/defect status from deployment/UAT/maintenance |
| B | 25 | Every Sprint 2 contract, full completion table, real domain behavior/tests and accepted Sprint 2 release |
| C | 15 | All Sprint 3 contracts plus at least one meaningful implemented and tested workflow/rule; exact remaining work |
| D | 10 | Complete current SRS/features/system SDS and full requirement → sprint → AC/target → actual verification/result/version |
| E | 15 | Deployed integrated candidate on main, build/regression/CI/deployment evidence and dated finish plan |

Preserve the original Sprint 2 release even if the candidate includes later work. Show two meaningful Sprint 2 features, at least one implemented Sprint 3 behavior and a short Sprint 1 continuity demonstration. Include two actual test excerpts and two Issue/PR chains. The full required documents appear inside the self-contained PDF, with navigation/internal page references.

## Lab 7: maintenance and release readiness

Preparation currently follows master §10. Obtain instructor/TA approval for one change to already implemented behavior or a business rule. An unfinished feature already in the baseline is not the maintenance exercise.

| Area | Points in master | Required outcome |
| --- | ---: | --- |
| Impact and revised contract | 25 | Approved change → affected requirement/feature/SDS/AC/tests/code, reviewed revision |
| Implementation/regression | 50 | Intended changed-behavior red test → implementation → pass/regression → reviewed CI/deployed release |
| Objective metrics | 15 | Five dated metrics with sources and an action-oriented interpretation of at most 100 words |
| Readiness/retrospective | 10 | Defect/test/debt/config/docs/release checks and three short answers: helped, hurt, change next |

Use the [change and metrics record](labs/lab-07/change-and-metrics.md). Keep CI history from Lab 5. Counts do not earn points for being large.

## Final Delivery: complete product, final evidence

| Part | Points | Required content |
| --- | ---: | --- |
| A | 35 | Complete required three-sprint workflows/rules, persistence/access/error handling and final demonstrations |
| B | 15 | Engineering chain, both members, two selected Issue/PR chains from different sprints |
| C | 20 | Complete final SRS/features/system SDS/all feature contracts/AC/STS and final verification traceability |
| D | 20 | Final-version build/regression/CI, independent UAT/re-tests, defect/debt/DoD, reproducible deployment |
| E | 10 | Actual running-product video presented by both students; version, major journey, rule and rejected case |

Submit one self-contained PDF plus the YouTube video link with viewing access. Complete documents may be appendices in the same PDF with internal page references. Include contributions/AI-use/limits once rather than duplicating them. Resolve the 10-versus-4-minute source conflict before recording the final video.

Run final required tests on the final assessed commit and match the deployed version. Old evidence is historical. Distinguish unfinished required behavior from technical debt; report blockers and failed/skipped/incomplete results honestly.

## Evidence and final gates

- Keep source documents/code/tests/configuration here; supplied PDFs and final assessment PDFs stay in the course repository.
- Use immutable release/run identifiers, actual test file/names, counts/results and a single current traceability matrix. Never use an unrelated passing test as coverage.
- Keep private/raw evidence in the course workspace's ignored `_private/pocket-ledger/` or safe workflow artifacts, creating folders only when needed.
- A screenshot supplements actual test/persistence/access evidence. Crop at complete boundaries, retain IDs and readability, and remove secret values/cursor artifacts.
- Preserve the public repo and assessed deployment until grading ends. Do not tear down while a TA or partner needs access.
- Each assessed release must satisfy its actual scope, tests/review/integration, accessible evidence, setup and honest limitations. Repository setup alone satisfies none of the completed-product gates.
