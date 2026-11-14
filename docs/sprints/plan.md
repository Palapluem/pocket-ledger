# Three-sprint delivery plan

Draft 0.2, 15 November 2026. Natthawat proposed the D-06 Sprint 1 scope and D-01 work split in PR #15; Wisit accepted them on 15 November. Formal PR review and merge remain pending. LEB2 group name is 2-Nor. No accepted application release exists.

| Sprint | Goal and included features | Dependencies | Completion outcome |
| --- | --- | --- | --- |
| 1 | Establish F-01/F-02 access, seeded F-03 accounts/opening balance, F-04 salary, F-05 split card purchase/repayment, F-06 balances/summary/history | D-01 to D-07, reviewed baseline and each feature's contract | Tested persistent domain journey, rule/access rejection, reproducible local setup and reviewed release on main; Deliverable 1 (saved handout: 8 November 23:59; student-reported extension to 14 November, official confirmation not recorded here) |
| 2 | Complete five-type account management and opening policy, remaining receive/payment/loan/transfer cases, search/filter/category summary, F-07 correction | Accepted S1; each new/changed contract; Lab 6 findings | Complete core expansion and accepted S2 release by Deliverable 2, 29 November 23:59 |
| 3 | Implement F-08 favourites/editable duplication, finish reports, reconcile UAT, regression, usability and release debt | S2 interfaces and correction policy | Meaningful tested progress by 29 November; complete verified product by Final Delivery, 13 December 23:59 |

## Immediate sequence

1. The D-01 to D-07 decisions proposed in PR #15 and accepted by Wisit on 15 November form the Sprint 1 baseline; formal PR review and merge remain pending. The course section remains unconfirmed; defer Origin/CSRF policy until deployment review.
2. Implement the accepted ownership split: Wisit handles F-03/F-04 and Natthawat handles F-05/F-06; each student reviews the other's work and both participate in tests, integration and release.
3. For each meaningful rule, preserve the intended failing test and then its correction/passing result. Use feature branches from current sprint staging and keep related docs/tests/code in the same PR.
4. Integrate F-01/F-02/F-03 before the complete F-04/F-05/F-06 journey. Run integration/acceptance checks, resolve failures and obtain teammate review on the release PR into main.
5. Assemble the self-contained Deliverable 1 PDF with the agreed A-E documents and actual Part F evidence. Empty execution fields remain unfinished, not PASS.
6. Carry that accepted release into Lab 5: clean Docker build, relevant required CI on staging/main PRs, controlled blocked-merge proof, GCP deployment and persistence verification. Lab 5 is due 15 November 23:59.

## Team task allocation

The assignments below are the agreed Sprint 1 work split; rows without an owner remain unassigned. Assignment is not evidence of completion. Both students must understand the requirements, tests, design and release steps sampled by a TA.

| Bounded work | Implementer / pair participants | Other teammate's specific review | Issue / evidence |
| --- | --- | --- | --- |
| F-01/F-02 identity/session and minimal administration | Natthawat (implemented); Wisit review | Wisit | PR #12/#14 |
| F-03 financial accounts and opening balance | Wisit | Natthawat | Issue #1 / feature PR |
| F-04 salary/receive journey | Wisit | Natthawat | Issue #1 / feature PR |
| F-05 split purchase and repayment | Natthawat | Wisit | Issue #1 / feature PR |
| F-06 balances, summary and history | Natthawat | Wisit | Issue #1 / feature PR |
| CI and controlled failed-check proof | | | |
| Clean Docker build, deploy and persistence checks | | | |
| Report evidence/content verification and print check | | | |

## Release and assessment gates

Deliverable 1 needs a local working release; completed Docker/GCP/CI is assessed in Lab 5. Lab 6 requires an independent project team, not the two developers reviewing themselves. Lab 7 needs an instructor/TA-approved change to already implemented behavior. Do not substitute an unfinished baseline feature for that maintenance exercise.

The saved handout sets Deliverable 1 for 8 November 2026; the course-repository work plan records Wisit's report of an extension to 14 November, but no official announcement is attached here. At this revision, F-01 identity and the F-02 administration backend are implemented on `sprint-1-staging`; the financial features F-03 to F-06 and their executable tests are not implemented or run, and no accepted `main` release exists. Record actual progress against the course's current deadline or extension; do not relabel planned work as complete or invent evidence.
