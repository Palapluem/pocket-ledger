# Lab 6 UAT handoff record

**Handoff status: the UAT plan was handed to Pockit, and the partner has published an execution record.** The Product Team shared the UAT-01 to UAT-10 plan for the PocketLedger Sprint 1 release on 23 November 2026. The partner's record is the source for case execution, findings, and its acceptance decision. This page records the handoff and links to that record; it does not summarize partner results or claim acceptance.

The handed-over plan is preserved unchanged in [`uat-instructions.md`](uat-instructions.md) (Git blob `ec167cd`, identical to the partner copy that Pockit ran on 23–25 November). A [revision 2 addendum](uat-instructions-revision-2.md), dated 27 November 2026, withdraws UAT-04 and UAT-05 from the required run, matching the scope recorded in the partner report. It keeps all case IDs and does not modify the handed-over file. The handed-over plan includes the test scope, version, safe account labels, procedures, expected results, and recording templates. The companion [Product Team handoff checklist](product-team-handoff-checklist.md) records the preparation checks and identifies handoff details that still need confirmation.

## Handoff record

| Item | Record |
| --- | --- |
| Product Team | PocketLedger, 2-Nor (TH-013_P7): Wisit Suwannao and Natthawat Primsirikunawut |
| UAT Team | Pockit; see the partner's report for tester attribution |
| Sprint 1 source under test | `37593da1cb3cd881e6b22845a2b4a929dbf6bc8e` |
| Public application URL | <https://pocket-ledger-468473091761.asia-southeast3.run.app> |
| UAT plan | Handed over: [`uat-instructions.md`](uat-instructions.md) (blob `ec167cd`). Revision 2 addendum (UAT-04/05 withdrawn): [`uat-instructions-revision-2.md`](uat-instructions-revision-2.md) |
| Partner execution record | [Pocket Ledger Sprint 1 UAT results](https://github.com/CPE334-Pockit/Pockit/blob/0a7a766d0d5078b02bfea6f8dc85058d0b9cbc7d/docs/labs/lab-06/peer-uat/evidence/run.md) (original run); [scope update marking UAT-04/05 withdrawn](https://github.com/CPE334-Pockit/Pockit/commit/e212779a15640d24c39494b1c59563f8ce1c1ea9) (Pockit commit `e212779`) |
| Results and acceptance | Maintained by the UAT Team. The UAT Team recorded its decision in [Pockit Issue #53](https://github.com/CPE334-Pockit/Pockit/issues/53#issuecomment-7201498329): "Decision: Accepted. Release 37593da. Testers: Guntee Doungmanee, Polwarit Watthanahemmarat. Date: 2026-11-27." This page quotes that record and does not make its own decision. |

Do not put credentials, tokens, private contact details, or account secrets in this repository. Confirm any outstanding handoff information privately and record only a non-sensitive confirmation in the checklist.
