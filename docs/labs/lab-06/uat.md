# Lab 6 UAT preparation and records

**Status: handed over and executed.** The Lab 6 handout (`Lab_6_Sprint_1_UAT.pdf`) is available and the instruction pack below follows it. The pack was handed to the partner UAT Team (Pockit), who executed UAT-01 to UAT-10 on commit `37593da` and recorded their results in [their run report](https://github.com/CPE334-Pockit/Pockit/blob/docs/lab-6-peer-uat/docs/labs/lab-06/peer-uat/evidence/run.md) (branch `docs/lab-6-peer-uat`, commit `1115d28`). The report lists no defect. For UAT-07 part B the UAT Team requested a restart; the Product Team rolled the same image to Cloud Run revision `pocket-ledger-00005-n78` on 2026-11-24 14:45 UTC.

The executable cases UAT-01 to UAT-10, the handoff identity, the recording templates and the Product Team checklist are in [uat-instructions.md](uat-instructions.md), which supersedes the candidate inventory below. Execution and triage results belong in the tester's and the Product Team's records, not in that instruction file.

## Release and private access handoff

| Field | Confirmed value |
| --- | --- |
| PocketLedger accepted release tag / full SHA | |
| Public URL / served revision | |
| Preparing team and date | |
| Independent partner team / testers | |
| Test window and stable test-data reset procedure | |
| Private delivery channel for synthetic account credentials | |
| Known limitations affecting the cases | |

Do not put actual credentials in this file. The partner must receive safe User A, User B and Admin test access as required by the cases, and know the tested version.

## Candidate case inventory

These cases must be finalized against approved AC and running UI/API behavior before handing them to the partner.

| Case | Goal | Coverage and expected behavior | Linked feature / AC |
| --- | --- | --- | --- |
| UAT-01 | Complete the core finance journey | Opening balance → salary → split card charge → repayment → persisted balances/debt/summary/history match the agreed values | |
| UAT-02 | Reject an invalid allocation | Allocation total differs from transaction total; useful rejection, no partial record/balance change | |
| UAT-03 | Protect another user's records | User B cannot read or change User A's financial data, including accounts used in allocation lines | |
| UAT-04 | Enforce the Admin privacy boundary | Admin can perform agreed platform-user work but cannot read/change users' financial records or summaries | |
| UAT-05 | Retrieve state/history and durable results | The same recorded transaction and related values can be retrieved after the agreed persistence/state check | |

For each case, specify exact safe preconditions, user-facing steps and expected output, not only a test ID. A minimum of four cases is required by the master; these five address PocketLedger's separate ownership and Admin boundaries.

## Execution record (one row per case and run)

| UAT ID | User goal / linked AC | Preconditions and steps | Expected result | Actual result and evidence | PASS / FAIL | Tester / team / date | Release / revision | Defect link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | |

Record execution on the partner's application separately from results received for PocketLedger. Neither a developer's self-check nor the other member of the same team is independent cross-team UAT.

## Defect triage and closure

| Defect | Case / observed version | Reproduction, expected / actual | Severity / impact | Decision and rationale | Owner | Regression red / fix / PR / CI / deployed version | Independent re-test and version |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

Decisions are accepted, duplicate, not a defect or enhancement with a reason. Track one legitimate accepted defect through a regression test, fix, teammate review, CI/deployment and independent partner re-test. Preserve the failed and corrected versions.

If no genuine accepted defect is found, ask the TA for the controlled known-failing exercise on an isolated version/branch. Do not invent a defect or break the accepted live application to manufacture evidence. Report access or partner delays promptly so the TA can assist.
