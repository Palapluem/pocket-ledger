# Team and assessment identity

| Member | Student ID | GitHub |
| --- | --- | --- |
| Wisit Suwannao | 67070501042 | Palapluem |
| Natthawat Primsirikunawut | 67070501027 | N0TAW00D |

- Product: **PocketLedger**.
- Theme: **7. Personal Money and Expense Logging System**, selected using the teammate's student-ID ending 7.
- Product repository: https://github.com/Palapluem/pocket-ledger
- Course-material repository: https://github.com/Palapluem/cpe334-software-engineer-2026
- Team: **2-Nor (TH-013_P7)**.
- Course section: **Section 1 (regular program)**, confirmed by the student.
- Record the independent Lab 6 partner team and participating students in the UAT evidence; the partner must be from another project team.

Both members participate across requirements/design, testing, implementation, supervision, review and deployment. Rotate work/review by task. Pair work names both participants in its Issue/PR. No equal-commit quota applies.

## Contributions

Record completed work from Issues, reviewed PRs and verification evidence. Assignment ownership alone is not a contribution record; the final report should also identify meaningful pair work and the release activities completed by each student.

| Assessment / period | Student | Work and responsibility | Issue / contract / commit / PR evidence | Review / verification |
| --- | --- | --- | --- | --- |
| Documentation preparation, 3–7 Nov 2026 | Wisit Suwannao | Organized the repository baseline, draft contracts/STS and report structure; unresolved policies remained for team review | Issues #1–3; PR #4 | PR #4 merged after N0TAW00D's approval; Wisit reviewed and approved PRs #5 and #6 |
| Stack and auth/setup proposals, 12 Nov 2026 | Natthawat Primsirikunawut | Authored PR #5 to record the D-02 stack decision and PR #6 for the auth/setup proposal; implementation tasks were unassigned at that stage | Issue #2; PRs #5 and #6 | N0TAW00D approved PR #4; no implementation contribution is claimed for this proposal period |
| Sprint 1 decisions, 15 Nov 2026 | Natthawat Primsirikunawut | Proposed the D-01 to D-07 Sprint 1 decision baseline covering money, dates, runtime pins, ownership and interfaces | Issue #1; PR #15, merged at `98afb3b` | Wisit accepted the decisions and approved PR #15; CI run 43637769801 passed on head `04aecea` |
| Sprint 1 identity and administration | Natthawat Primsirikunawut | Implemented F-01 identity/session and F-02 platform administration, including UI/API behavior and tests | PRs #12, #14 and #18; merged into `sprint-1-staging` | Wisit reviewed and approved the final PR heads; current integrated identity/admin checks pass in CI #59 |
| Sprint 1 payment, balances and history | Natthawat Primsirikunawut | Implemented F-05 payment/charge and F-06 balance, summary and history paths with tests | Issue #21 / PR #22; merged at `7d8be8e` | Wisit reviewed and approved the final PR head; integrated candidate passes CI #59 |
| Lab 5 delivery, 15–16 Nov 2026 | Natthawat Primsirikunawut | Added the Docker image, Compose setup, migration job, main-only Cloud Run deployment workflow and GCP runbook | Issue #17 / PR #19; merged at `a77d324` | Wisit approved PR #19 at head `9140b15`; CI #48 passed. At the time of that review, the GCP deployment had not been run |
| Shared schema and F-03/F-04 cross-review, 15–16 Nov 2026 | Natthawat Primsirikunawut | Reviewed the canonical financial schema and F-03/F-04 implementation; identified and verified the schema/date-driver and future-opening-date fixes | PR #23 and PR #25 | N0TAW00D approved #23 at `8203878` (CI #43) and #25 at `420c6bd` (CI #59) |
| Sprint 1 accounts and receive | Wisit Suwannao | Implemented F-03 seeded/owned accounts and opening balance plus F-04 salary receipt, validation and retry behavior; recorded the agreed future-opening-date rule | Issue #20 / PR #25; merged at `53c20ff` | N0TAW00D approved PR #25 head `420c6bd`; CI #59 passed before merge; TEST-27 clean-checkout run passed on `53c20ff` |
| Sprint 1 cross-review, 13–16 Nov 2026 | Wisit Suwannao | Reviewed implementation, test safety, contracts and deployment changes; requested and verified fixes before approving the final heads | PRs #12, #14, #18, #19 and #22 | Approved #12 at `604b3be`, #14 at `eebd174`, #18 at `e743367`, #19 at `9140b15` and #22 at `d454ef8`; each approval followed resolution of its review findings |
| PD1 status/evidence reconciliation | Wisit Suwannao | Coordinated clean-checkout verification and documentation updates; this is not a product-code contribution | Issue #26 / documentation PR to staging (review was pending at the time) | TEST-27 results are recorded in the STS; teammate review and main release were pending at that time |

The entries above preserve the status of each activity when recorded. For the accepted Sprint 1 release and subsequent deployment, see `docs/releases.md` and `docs/labs/lab-05/deployment.md`; add later contributions only when their evidence is verified.
