# Decision Register

This local Markdown register identifies records by their titles. An `OPEN` status means that a question remains to be answered; it does not mean that a GitHub Issue is open.

| Topic | Type | Status | Decision owner / assignee | Depends on |
| --- | --- | --- | --- | --- |
| [Source review and team topic confirmation](#source-review-and-team-topic-confirmation) | `wayfinder:research` | DONE | Wisit | — |
| [Confirm PocketLedger and Git repository boundaries](#confirm-pocketledger-and-git-repository-boundaries) | `wayfinder:research` | DONE | Wisit | Source review and team/topic confirmation |
| [Confirm team details and stack](#confirm-team-details-and-stack) | `wayfinder:grilling` | OPEN | Wisit + Natthawat | Confirm PocketLedger and Git repository boundaries |
| [Agree financial rules and Sprint 1 scope](#agree-financial-rules-and-sprint-1-scope) | `wayfinder:grilling` | OPEN | Wisit + Natthawat | Source review and team/topic confirmation |

The current frontier consists of the two `OPEN` records. The team can answer them before approving contracts. Organizing documents and extracting the starter archive do not depend on these decisions.

## Source review and team topic confirmation

**Status:** DONE, 3 November 2026 · **Assignee:** Wisit

### Question

Which source materials are available, what does each one govern, and what are the group and project topic?

### Resolution

The source materials and links listed in the [course project index](https://github.com/Palapluem/cpe334-software-engineer-2026/blob/main/project/README.md) were checked. The master brief, Deliverable 1, Deliverable 2, Final, and Lab 5 handout were read in full. The English contents of the Workflow Guide were read in full. Relevant Lecture 11 pages on SDD, release, workflow, and smoke testing were reviewed. The Student Guide overview, cloud-ready, merge-gate, persistence/rollback, README, and starter-kit CI sections were checked. The entire 105-page guide was not walked through page by page.

The student confirmed the team members and Theme 7. All four PDFs in the course repository's `project/` directory were byte-for-byte identical to the Week 10 set. The starter ZIP's CRC was checked, and all 23 extracted files were compared before the original ZIP was deleted. See [course Lab 5](https://github.com/Palapluem/cpe334-software-engineer-2026/blob/main/labs/Lab05/README.md) for the recorded details.

Deliverable 1 requires complete engineering content in the PDF under handout §4. Lab 5 uses a concise evidence index under handout §12. These are assignment-specific requirements; one report format should not be substituted for the other.

Detailed Lab 6 and Lab 7 PDFs were not in the folders the student had prepared at setup, so master brief §10 was used for preparation only. Deliverable 2 §4 specifies a 23:59 deadline. Final §§2 and 3.5 conflict on whether the video should be 10 or 4 minutes; the conflict is recorded in the [assessment plan](../assessment-plan.md).

## Confirm PocketLedger and Git repository boundaries

**Status:** DONE, 3 November 2026 · **Assignee:** Wisit

### Question

What are the group product and repository, where does its source live, and how will it remain separate from the course repository?

### Resolution

The student selected **PocketLedger**, with repository `Palapluem/pocket-ledger` and local checkout `project/pocket-ledger/` inside the course workspace. This directory has its own Git root and is excluded by the course repository's `.gitignore`; it is not a submodule.

Product specifications, code, tests, and configuration belong in the product repository. Course handouts, lecture materials, preparation guides, and submitted PDFs belong in the course repository. Before every Git write, verify the repository root, remote, and working-tree status as required by `AGENTS.md`. Bootstrap covers documents and repository setup; it is not an accepted Sprint 1 release.

## Confirm team details and stack

**Status:** OPEN · **Type:** `wayfinder:grilling` · **Decision owners:** Wisit + Natthawat

Track the work in [Issue #2: Confirm team metadata, runtime and authentication design](https://github.com/Palapluem/pocket-ledger/issues/2).

### Question

What are the group name, number, section, and stack? How will authentication and sessions work, and have both members confirmed repository access and review arrangements?

### Details to confirm

| Item | Team answer |
| --- | --- |
| Group name / number / section | |
| Product name and specific user context | PocketLedger; further context pending team discussion |
| Product repository URL and owner | https://github.com/Palapluem/pocket-ledger · Palapluem |
| Sprint staging branch and Issue/branch workflow | `sprint-1-staging`; see `CONTRIBUTING.md` |
| UI / API / database / migration / test tooling | |
| Runtime version shared by local development, CI, and image | |
| Session/token approach, logout, and user deactivation behavior | |
| Who starts the first feature / who reviews, and how responsibilities rotate | |

**Revisable proposal, not a decision:** use a stack familiar to the team and a small architecture that can complete a UI → API → persistent database path. Use one consistent container runtime version. Do not add microservices or multiple servers merely to represent every layer.

### Done when

The team has answered the items above with any necessary rationale, repository access meets the requirements, and the System-Level SDS can be written without guessing the environment or commands.

## Agree financial rules and Sprint 1 scope

**Status:** OPEN · **Type:** `wayfinder:grilling` · **Decision owners:** Wisit + Natthawat

Track the work in [Issue #1: Agree the financial rules and Sprint 1 vertical slice](https://github.com/Palapluem/pocket-ledger/issues/1).

### Question

How will Theme 7 become a set of financial rules with verifiable outcomes, and which complete vertical slice will Sprint 1 deliver by 8 November?

### Requirements already specified by the assignment

Use [Theme 7 coverage and proposed sprint allocation](../assessment-plan.md#whole-product-coverage-and-proposed-sprint-allocation) and the [GLOSSARY](../../GLOSSARY.md) as the starting point. Do not reduce the scope to generic expense CRUD or allow an Administrator to read financial records.

### Decisions required before writing contracts

| Topic | What the rule and tests must specify |
| --- | --- |
| Currency and amounts | Supported currencies, precision/scale, maximum amount, zero/negative amounts, and rounding. Floating-point rounding must not become an accidental policy. |
| Balance convention | How balances and signs work for Cash, Loan Given, Loan Taken, Income, and Expense; how opening balances affect each type. |
| Allocation compatibility | Which source/destination account types each transaction form accepts; every referenced account must belong to the user; allocation lines must sum to the total. |
| Atomicity | If one line is invalid or a save fails, no partial balance or line may remain. Verify through API reads of balances and history. |
| Opening balance | Effective date, whether it can be edited after transactions exist, and how it affects balances without counting as Income or Expense. |
| Dates and summaries | Date format/time zone, permitted future or past dates, reporting-period boundaries, and balance cut-off dates. |
| Corrections | Whether to edit the original transaction or use reversal/replacement; how history and balances are preserved; which sprint handles it. |
| Duplicates and retries | When a duplicate can be edited/confirmed; how an intentional duplicate differs from a request retry; define only the policy required by the contract. |
| Administration | How enabling/disabling a user affects sessions; the minimum meaningful Administrator work; financial APIs must also reject Administrator access. |
| Sprint boundary | Which account and transaction types have complete UI in Sprint 1 and which use reproducible seed data; place the remaining scope in Sprint 2/3 inventory. |
| Test seams | Which public domain interfaces, HTTP API with a real test database, and UI journeys will be verified; agree these before writing executable tests. |

### Illustrative example

**Illustrative numbers only—not provided by the instructor and not an approved team policy.** Assume one currency and that all entries fall within the same reporting period.

| Step | Bank balance | Credit-card debt | Income | Expense |
| --- | ---: | ---: | ---: | ---: |
| Set an opening bank balance of 10,000 | 10,000 | 0 | 0 | 0 |
| Receive a salary of 20,000 into the bank | 30,000 | 0 | 20,000 | 0 |
| Make a 1,200 credit-card purchase: dining 700 + groceries 500 | 30,000 | 1,200 | 20,000 | 1,200 |
| Pay 500 toward the card from the bank | 29,500 | 700 | 20,000 | 1,200 |

The saved record should be readable. Reject an allocation such as 700 + 400 when the total is 1,200, without changing balances. Reject User B or an Administrator attempting to read or change User A's financial records. Expected values must be independently agreed; do not calculate them with the same algorithm as the implementation, which could let a test pass itself.

### Done when

Record the chosen rules in the SRS, System-Level SDS, or feature contracts, with expected results and the rationale for exceptions. Both team members can explain them. The next work can then be framed as a bounded implementation task. The team does not need to fix every Sprint 3 endpoint before starting Sprint 1.
