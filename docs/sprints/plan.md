# Three-sprint delivery plan

Draft 0.5, updated 21 November 2026. The D-06 Sprint 1 scope and D-01 work split were accepted by both students and integrated through PR #15 (`98afb3b`). F-01–F-06 are now integrated into `sprint-1-staging` at `53c20ff`; PR #25 was approved by N0TAW00D. CI #59 passed on PR head `420c6bd`, and clean-checkout TEST-27 passed on staging. Since 19 Nov, the accepted Sprint 1 release on `main` is `265c995` (release PR #32, deployed to Cloud Run; register in `docs/releases.md`). Release PR #38 then advanced `main` to `37593da`, which deploys the same application code with only a TEST-28 test fix and documentation (`docs/releases.md`). LEB2 group name is 2-Nor.

| Sprint | Goal and included features | Dependencies | Completion outcome |
| --- | --- | --- | --- |
| 1 | Establish F-01/F-02 access, seeded F-03 accounts/opening balance, F-04 salary, F-05 split card purchase/repayment, F-06 balances/summary/history | D-01 to D-07, reviewed baseline and each feature's contract | Tested persistent domain journey, rule/access rejection, reproducible local setup and reviewed release on main; Deliverable 1 (saved handout: 8 November 23:59; student-reported extension to 14 November, official confirmation not recorded here) |
| 2 | Complete five-type account management and opening policy, remaining receive/payment/loan/transfer cases, search/filter/category summary, F-07 correction | Accepted S1; each new/changed contract; Lab 6 findings | Complete core expansion and accepted S2 release by Deliverable 2, 29 November 23:59 |
| 3 | Implement F-08 favourites/editable duplication, finish reports, reconcile UAT, regression, usability and release debt | S2 interfaces and correction policy | Meaningful tested progress by 29 November; complete verified product by Final Delivery, 13 December 23:59 |

## Immediate sequence

1. Keep the accepted D-01 to D-07 baseline; the course section is confirmed as Section 1. D-05 Origin/CSRF request protection remains deferred: PR #24 was closed unmerged, and the public deployment discloses the deferral as a known limitation (`docs/labs/lab-05/deployment.md`). It is still to be resolved.
2. F-01–F-06 and their core Sprint 1 journey are integrated into `sprint-1-staging` at `53c20ff`. PR #25 was approved by N0TAW00D; CI #59 passed on head `420c6bd`; clean-checkout TEST-27 passed on the merged staging SHA.
3. Finish the single bounded status/evidence reconciliation in Issue #26. Obtain N0TAW00D's substantive review and merge that documentation PR into staging; do not create a second documentation PR for the same closeout.
4. Run integration/acceptance checks on the final staging candidate, then open the required reviewed release PR from `sprint-1-staging` to `main`. N0TAW00D must review and merge it; no author self-approval or self-merge.
5. On the exact accepted `main` release, run and record the required checks. Capture Part F demonstrations, test output/excerpts, two reviewed Issue/PR examples, workflow/history evidence, contributions and final board status; complete A–F page ranges and the self-contained PDF.
6. Keep Lab 5 separate: Docker/CI/GCP deployment and durable persistence proof belong there, not in PD1. The handout's 8 November deadline and the student-reported 15 November 23:30 cutoff have both passed; no later extension is verified.

## Team task allocation

The assignments below are the agreed Sprint 1 work split; rows without an owner remain unassigned. Assignment is not evidence of completion. Both students must understand the requirements, tests, design and release steps sampled by a TA.

| Bounded work | Implementer / pair participants | Other teammate's specific review | Issue / evidence |
| --- | --- | --- | --- |
| F-01/F-02 identity/session and minimal administration | Natthawat (PRs #12/#14/#18) | Wisit | Integrated in staging; identity/admin API and browser checks in CI #59 |
| F-03 financial accounts and opening balance | Wisit (Issue #20 / PR #25) | Natthawat | Approved by N0TAW00D; merged at `53c20ff`; CI #59 on head `420c6bd` |
| F-04 salary/receive journey | Wisit (Issue #20 / PR #25) | Natthawat | Approved by N0TAW00D; merged at `53c20ff`; CI #59 on head `420c6bd` |
| F-05 split purchase and repayment | Natthawat (Issue #21 / PR #22) | Wisit | Merged at `7d8be8e`; included in integrated CI #59 |
| F-06 balances, summary and history | Natthawat (Issue #21 / PR #22) | Wisit | Merged at `7d8be8e`; included in integrated CI #59 |
| CI and controlled failed-check proof | | | |
| Clean Docker build, deploy and persistence checks | | | |
| Report evidence/content verification and print check | | | |

## Release and assessment gates

Deliverable 1 needs a local working release; completed Docker/GCP/CI is assessed in Lab 5. Lab 6 requires an independent project team, not the two developers reviewing themselves. Lab 7 needs an instructor/TA-approved change to already implemented behavior. Do not substitute an unfinished baseline feature for that maintenance exercise.

The saved handout sets Deliverable 1 for 8 November 2026. Wisit later reported a cutoff of 15 November at 23:30 Asia/Bangkok; both have passed and no later extension is verified. As of 16 November, F-01–F-06 are integrated and tested on `sprint-1-staging` at `53c20ff`, and on 19 Nov release PR #32 made `265c995` the accepted `main` release; release-matched TEST-27 passed on it on 20 Nov (`docs/releases.md`). The self-contained report remains incomplete; do not claim submission readiness.
