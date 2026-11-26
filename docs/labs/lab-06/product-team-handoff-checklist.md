# Product Team UAT handoff checklist

Use this checklist with [`uat-instructions.md`](uat-instructions.md) before sending a UAT pack. The instruction file is the preserved copy handed to the partner; do not silently edit it after handoff. Record later corrections in a dated addendum. Never record credentials, tokens, private contact details, or private delivery-channel information here.

## Before handoff

- [ ] Confirm the assessed Sprint 1 scope and link every case to its requirement or acceptance criterion.
- [ ] Verify the source commit and deployed application version from the public health endpoint; include the public URL and revision only when verified.
- [ ] Check that the pack gives safe roles and account labels, setup/reset steps, preconditions, user actions, and specific expected results.
- [ ] Walk through the cases on the deployed application. If this has not happened, say so plainly and identify the remaining check.
- [ ] Fill every `TBC` field in the copy that will be handed over: Product Team contact, test/re-test window, UAT team and participants. Do not send a copy with required fields blank.
- [ ] Confirm that both students on the UAT Team will participate and that both are identified in the execution record.
- [ ] Agree how synthetic test credentials will be delivered privately. Record only that delivery was confirmed; never put the channel or credential values in Git.
- [ ] Confirm the partner has the pack, the tested version, the safe account access, and a way to ask questions or report a blocker.
- [ ] Check all relative links, evidence instructions, and the exact-copy requirement before recording the final file hash.

## Record for the 23 November 2026 handoff

| Check | Evidence-based status |
| --- | --- |
| Pack shared with Pockit | Confirmed by PocketLedger Issue #44 and the partner's linked run record. |
| Partner copy matches this repository's pack | Confirmed: both files have Git blob SHA `ec167cd4b9f2b5014629b81f79a839f06fccf799`. |
| Tested source commit and public URL | Included in the preserved pack; the partner report records the same commit and URL. |
| Live walk-through before handoff | Not confirmed by the versioned records. The preserved pack says it had not yet been confirmed when prepared. Do not mark complete without evidence of a later walk-through. |
| Product Team contact and agreed test/re-test window | Still `TBC` in the preserved pack. Confirmed 26 November 2026 (see the addendum below): the teams coordinated on Discord, and the test window was 24 to 25 November 2026. |
| Private credential delivery | Confirmed 26 November 2026: synthetic test credentials were delivered privately outside Git. The channel and values are not recorded. |
| UAT Team participation | The partner report identifies Pockit and names Guntee Doungmanee as the recorded tester. Lab 6 requires both students to participate; the available record does not establish participation by the second student. Obtain and record that confirmation before treating the participation requirement as complete. |
| Partner case results and acceptance | The partner's report is authoritative. Keep case outcomes, findings, and its acceptance decision there rather than duplicating them in this handoff record. |

This record makes the remaining evidence gaps visible; it does not turn an unverified item into a completed handoff requirement. Update it only when supporting evidence exists.

## Addendum, 26 November 2026

Non-sensitive confirmations supplied by the Product Team (Natthawat Primsirikunawut) for the `TBC` fields of the preserved pack. The pack itself is unchanged.

| `TBC` field in the pack | Confirmation |
| --- | --- |
| Product Team contact / test window | Coordination with the Pockit UAT Team on Discord. Test window: 24 to 25 November 2026. |
| Private credential channel | Synthetic credentials were delivered privately, outside Git. The channel and values are deliberately not recorded. |
| UAT Team and testers | Pockit: Polwarit Watthanahemmarat (67070501067) and Guntee Doungmanee (67070501003). The partner report names Guntee Doungmanee as the recorded tester. Participation by the second student is not established by that record (see above). |

Version coordination during the window: the UAT Team requested a restart for UAT-07 part B. On 24 November 2026 at 14:45 UTC the Product Team rolled the same image (same commit `37593da`) to Cloud Run revision `pocket-ledger-00005-n78`. `gcloud run revisions describe` shows the same image digest for `pocket-ledger-00004-hxk` and `pocket-ledger-00005-n78`, and `/api/health` still reports `37593da`. Under the pack's coordination rules this is not a version change.
