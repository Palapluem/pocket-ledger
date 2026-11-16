# Team and assessment identity

| Member | Student ID | GitHub |
| --- | --- | --- |
| Wisit Suwannao | 67070501042 | Palapluem |
| Natthawat Primsirikunawut | 67070501027 | N0TAW00D |

- Product: **PocketLedger**.
- Theme: **7. Personal Money and Expense Logging System**, selected using the teammate's student-ID ending 7.
- Product repository: https://github.com/Palapluem/pocket-ledger
- Course-material repository: https://github.com/Palapluem/cpe334-software-engineer-2026
- LEB2 group name: **2-Nor**, confirmed by the student on 7 November 2026.
- Section and any separately required team number: **not yet confirmed**; do not infer them from the group name.
- Lab 6 independent partner team: **not yet assigned**; it must be another project team.

Both members participate across requirements/design, testing, implementation, supervision, review and deployment. Rotate work/review by task. Pair work names both participants in its Issue/PR. No equal-commit quota applies.

## Contributions

Record completed work from Issues, reviewed PRs and verification evidence. Assignment ownership alone is not a contribution record; the final report should also identify meaningful pair work and the release activities completed by each student.

| Assessment / period | Student | Work and responsibility | Issue / contract / commit / PR evidence | Review / verification |
| --- | --- | --- | --- | --- |
| Sprint 1 identity and administration | Natthawat Primsirikunawut | Implemented F-01 identity/session and F-02 minimal platform administration, including UI/API behavior and tests | PRs #12, #14 and #18; integrated into `sprint-1-staging` | Wisit reviewed the implementation PRs; current integrated identity/admin checks pass in CI #59 |
| Sprint 1 payment, balances and history | Natthawat Primsirikunawut | Implemented F-05 split card purchase/repayment and F-06 balance, summary and history paths with tests | Issue #21 / PR #22; merged at `7d8be8e` | Wisit reviewed the shared-schema/contract changes; integrated candidate passes CI #59 |
| Sprint 1 accounts and receive | Wisit Suwannao | Implemented F-03 seeded/owned accounts and opening balance plus F-04 salary receipt, validation and retry behavior; recorded the agreed future-opening-date rule | Issue #20 / PR #25; merged at `53c20ff` | N0TAW00D approved PR #25 head `420c6bd`; CI #59 passed before merge; TEST-27 clean-checkout run passed on `53c20ff` |
| PD1 status/evidence reconciliation | Wisit Suwannao | Coordinated clean-checkout verification and documentation updates; this is not a product-code contribution | Issue #26 / documentation PR to staging (review pending) | TEST-27 results are recorded in the STS; teammate review and main release remain pending |

The current status does not yet establish the final `main` release or report contribution record. Add the release PR/commit, final reviewer evidence and both students' report contributions after they occur; do not infer them from this table.
