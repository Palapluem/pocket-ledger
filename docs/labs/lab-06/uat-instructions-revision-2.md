# PocketLedger Sprint 1 UAT instructions: revision 2 addendum

**Status: scope update, 27 November 2026.** The Product Team withdrew UAT-04 and UAT-05 from the required UAT run. The Pockit UAT Team recorded the same scope in its report (Pockit commit `e212779`, `docs/labs/lab-06/peer-uat/evidence/run.md`, "Withdrawn from revised scope"). This addendum takes effect after teammate review and merge of PR #50.

## Relation to the handed-over plan

- The plan handed to Pockit on 23 November 2026 stays unchanged in [`uat-instructions.md`](uat-instructions.md) (Git blob `ec167cd4b9f2b5014629b81f79a839f06fccf799`). Pockit's run of 23–25 November used that plan.
- Case IDs do not change. UAT-04 and UAT-05 keep their numbers and definitions for traceability, but they are no longer part of the required run. UAT-01 to UAT-03 and UAT-06 to UAT-10 are unchanged.

## Change

| Case | Change |
| --- | --- |
| UAT-04 (another user cannot read or change this user's records) | Withdrawn from the required run |
| UAT-05 (Administrator privacy and role boundary) | Withdrawn from the required run |

The partner's earlier partial observations for these cases stay in its record as history. They are not counted as passes.

## Coverage effect

After this revision, the UAT plan has **no independent forbidden role/ownership case**. Lab 6 §3.1 asks for one that covers another user's records and Administrator denial of financial data, so the required category is not met by independent UAT. Cross-user and Administrator access rules (AC-07, AC-08, AC-12, AC-15 foreign references, AC-21) are evidenced by developer tests only, such as TEST-21 and TEST-08 on `37593da`. Report this as a limitation. Do not report UAT-04 or UAT-05 as executed or passed.

The UAT Team records its decision in its own report. The Product Team does not record or change those results.
