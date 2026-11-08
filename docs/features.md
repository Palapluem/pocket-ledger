# Feature inventory

Draft 0.1, 7 November 2026. Sprint allocation is proposed under D-06. The inventory covers the whole baseline; no feature is currently implemented or accepted.

| Feature | Requirement coverage | Sprint 1 increment | Later completion |
| --- | --- | --- | --- |
| F-01 Identity and access | FR-01; BR-01/02/11; NFR-01 | Login, logout, identity, session expiry and backend access checks | Final security/regression in Sprint 3 |
| F-02 Platform user administration | FR-02; BR-02/11; NFR-01 | User identity list and enable/disable with the agreed safeguards | Remaining approved access-management details in Sprint 2 |
| F-03 Financial accounts and opening balances | FR-03/04; BR-01/05/06/08/10/12 | Safe seed of owned bank/card/income/expense accounts; user sets opening bank balance | Account management for all five types and full opening-balance policy in Sprint 2 |
| F-04 Receive money | FR-06; BR-01/03/04/05/06/07/08/10 | Salary receipt into bank, saved allocations and rejection cases | Borrowing, repayment received and transfers in Sprint 2 |
| F-05 Payment or charge | FR-05; BR-01/03/04/05/06/07/08/10 | Split credit-card purchase and bank-to-card repayment | Loans given, remaining transfers and combinations in Sprint 2 |
| F-06 Balances, summaries and history | FR-07/08/09; BR-01/02/05/06/08; NFR-02/03 | Bank/card balances, income/expense totals and persisted history for the required journey | Search/filter and category summaries in Sprint 2; reporting polish in Sprint 3 |
| F-07 Transaction correction | FR-10; BR-01/05/06/07/08/10 | Reserve coverage; define method before its own implementation | Correct transaction, balance and history behavior in Sprint 2 |
| F-08 Favourites and duplicate | FR-11/12; BR-01/09 | Reserve coverage without claiming implementation | Favourites and editable duplication in Sprint 3 |

## Dependencies and readiness

F-01 establishes the identity boundary used by F-02 to F-08. F-03 establishes owned accounts before F-04/F-05. F-06 depends on persisted F-03/F-04/F-05 records. F-07 must preserve the same calculation and history rules. F-08 must revalidate ownership and amounts when its draft is saved.

NFR-04 is a named system delivery responsibility across the first implementation and each release. Docker/CI/GCP delivery is assessed in Lab 5. Independent UAT and maintenance continue on this same product in Labs 6/7; they are not replacements for missing baseline features.

See [traceability](traceability.md), [the sprint plan](sprints/plan.md), [Sprint 1 contracts](sprints/sprint-1/contract.md) and [the STS](sprints/sprint-1/tests.md). Record changes to approved scope with the reason, affected requirements and reviewer; do not silently move unfinished Sprint 2 work into Sprint 3.
