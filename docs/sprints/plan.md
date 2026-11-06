# Three-sprint delivery plan

Draft 0.1, 7 November 2026. The team must approve the scope and dependencies in D-06. LEB2 group name is 2-Nor. No accepted application release exists.

| Sprint | Goal and included features | Dependencies | Completion outcome |
| --- | --- | --- | --- |
| 1 | Establish F-01/F-02 access, seeded F-03 accounts/opening balance, F-04 salary, F-05 split card purchase/repayment, F-06 balances/summary/history | D-01 to D-07, reviewed baseline and each feature's contract | Tested persistent domain journey, rule/access rejection, reproducible local setup and reviewed release on main; Deliverable 1, 8 November 23:59 |
| 2 | Complete five-type account management and opening policy, remaining receive/payment/loan/transfer cases, search/filter/category summary, F-07 correction | Accepted S1; each new/changed contract; Lab 6 findings | Complete core expansion and accepted S2 release by Deliverable 2, 29 November 23:59 |
| 3 | Implement F-08 favourites/editable duplication, finish reports, reconcile UAT, regression, usability and release debt | S2 interfaces and correction policy | Meaningful tested progress by 29 November; complete verified product by Final Delivery, 13 December 23:59 |

## Immediate sequence

1. Both students record the remaining team, runtime, money/date, session and Sprint 1 decisions. Review the baseline documents and contract; record the agreed revision before dependent code.
2. Assign one bounded identity/access task and one financial-domain task. Agree shared API/data interfaces first. Each student performs implementation and test work and reviews the other student's work. Rotate responsibility in later tasks.
3. For each meaningful rule, preserve the intended failing test and then its correction/passing result. Use feature branches from current sprint staging and keep related docs/tests/code in the same PR.
4. Integrate F-01/F-02/F-03 before the complete F-04/F-05/F-06 journey. Run integration/acceptance checks, resolve failures and obtain teammate review on the release PR into main.
5. Assemble the self-contained Deliverable 1 PDF with the agreed A-E documents and actual Part F evidence. Empty execution fields remain unfinished, not PASS.
6. Carry that accepted release into Lab 5: clean Docker build, relevant required CI on staging/main PRs, controlled blocked-merge proof, GCP deployment and persistence verification. Lab 5 is due 15 November 23:59.

## Team task allocation

This table is ready for the students to fill together. A suggested work lane is not an assignment or a completed contribution. Both students must understand the requirements, tests, design and release steps sampled by a TA.

| Bounded work | Implementer / pair participants | Other teammate's specific review | Issue / evidence |
| --- | --- | --- | --- |
| Identity/session and minimal administration | | | |
| Financial account model and safe setup/seed | | | |
| Salary, split purchase and repayment rules/tests | | | |
| Transaction UI and persisted balance/history journey | | | |
| CI and controlled failed-check proof | | | |
| Clean Docker build, deploy and persistence checks | | | |
| Report evidence/content verification and print check | | | |

## Release and assessment gates

Deliverable 1 needs a local working release; completed Docker/GCP/CI is assessed in Lab 5. Lab 6 requires an independent project team, not the two developers reviewing themselves. Lab 7 needs an instructor/TA-approved change to already implemented behavior. Do not substitute an unfinished baseline feature for that maintenance exercise.

The 8 November deadline is fixed by the supplied handout. As of this draft, the application and automated tests are not implemented. If the planned scope cannot be delivered, report the actual limitation to the instructor/TA; do not relabel planned work as complete or invent evidence.
