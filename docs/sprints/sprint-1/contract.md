# Sprint 1 feature engineering contracts

Draft 0.2, prepared 7 November 2026 and updated 13 November. Includes F-01 to F-06. The Better T Stack and first-party signed-JWT authentication (D-02, D-05) are selected; runtime/image pins, token lifetime/signing details and D-01, D-03, D-04, D-06 and D-07 remain open. This is a reviewable pre-implementation contract. Neither student has accepted the proposed product policies or been assigned an implementation feature. No code, tests or product release are established by this document.

## Contract identity and revision

| Field | Value / evidence |
| --- | --- |
| Baseline and design | SRS, feature inventory, traceability and System-Level SDS in docs/ |
| Decision work | Issue #1 financial/scope/interfaces; Issue #2 team/runtime/authentication; [auth/setup proposal](auth-setup-proposal.md) |
| Documentation review | PR #4 merged after N0TAW00D approval; PR #5 and #6 reviewed and merged by Palapluem; PR #7 approved by Palapluem and merged at `3e8bc5f`; PR #9 selected the JWT approach (D-02, D-05). No implementation or product tests are claimed |
| Implementation Issue / branch / owner / reviewer | |
| Approved contract revision and pre-code commit | |

| Revision | Reason | Approval and implementation impact |
| --- | --- | --- |
| 0.1, 7 November 2026 | Establish actual PocketLedger draft contracts and STS instead of old TokTickIT report content | Team decisions/review pending; no retrospective approval claimed |
| 0.2, 13 November 2026 | Align F-01 with the JWT approach selected in PR #9: no server-side session or revocation; spec-level outcomes only | Documentation only; implementation details stay open until recorded |

## F-01 Identity and access

User goal: sign in and use only the operations allowed by the signed-in identity's role. Preconditions are a seeded User or Administrator and an available persistent identity store. On valid credentials, issue the approved signed credential and return the current identity. Protected requests derive identity and role server-side from the verified credential. Logout clears the credential in the browser. Invalid credentials and disabled identities receive a safe response.

Dependencies: D-02, D-05 and D-07. UI: Sign in and role-appropriate navigation, including ready/submitting/failure states. API: the three /api/session operations in the System SDS. Data: UserAccount; the credential is a signed token and has no server-side session record. Password hashing and backend access tests are required. D-05 records the accepted logout and account-change limits; token lifetime, signing details and write-request protection are recorded before implementation.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-01 | Valid enabled User and Administrator log in and retrieve the correct current identity/role | FR-01; NFR-01 | TEST-01 |
| AC-02 | Wrong/unknown/disabled identity receives the approved safe login failure; no session or private data is returned | FR-01; BR-11; NFR-01 | TEST-02 |
| AC-03 | Anonymous callers and callers with an invalid, tampered or expired credential cannot reach protected operations | FR-01; BR-01/02; NFR-01 | TEST-03 |
| AC-04 | After logout the browser no longer holds a credential and cannot retrieve protected financial or administration data; copied-token reuse follows D-05 | FR-01; NFR-01 | TEST-04 |
| AC-05 | Disabling a User blocks new login; the effect on an already-issued credential follows D-05 | FR-01/02; BR-11 | TEST-05 |

## F-02 Platform user administration

User goal: an Administrator controls platform access without seeing finances. Load a safe identity list, select a user, change enabled state, then retrieve the new state. A rejected safeguard leaves identities unchanged. No administrator financial overview or financial API exception is allowed.

Dependencies: F-01 and D-05/D-07. UI: Platform users list and enabled-state action with loading/success/error feedback. API: GET/PATCH /api/admin/users. Data: update identity access only. Review self/last-administrator safeguards explicitly; they are not borrowed silently from TokTickIT.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-06 | Administrator retrieves only safe user identity fields and persists an agreed enable/disable operation | FR-02; BR-11 | TEST-06 |
| AC-07 | User and anonymous callers cannot list or change platform users | FR-02; NFR-01 | TEST-07 |
| AC-08 | Administrator calls to financial account, transaction and summary operations are rejected without financial data | BR-02; NFR-01 | TEST-08 |

## F-03 Financial accounts and opening balance

User goal: start the required journey with owned bank/card/income/expense records and record an opening bank balance. Safely seed two Users with distinct accounts plus an Administrator. The acting User selects their seeded bank account, enters the opening amount/date and retrieves the saved result. The opening amount affects the balance but not current-period income/expense.

Dependencies: F-01, D-03/D-04/D-07. UI: Accounts/opening-balance form. API: owned account list and opening-balance update. Data: FinancialAccount owner/type/currency/opening state. Seed is setup support, not evidence of a user performing the required opening-balance action. Full five-type account management remains in Sprint 2.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-09 | Synthetic identities/accounts are reproducible; rerunning seed preserves existing user financial activity | FR-03; BR-12; NFR-04 | TEST-09 |
| AC-10 | User records and retrieves the agreed opening bank balance/date; account balance matches the independent expected value | FR-04; BR-05/08/10 | TEST-10 |
| AC-11 | Opening balance does not appear as salary, income or expense in the selected summary | FR-04; BR-06 | TEST-11 |
| AC-12 | User B cannot read/change User A's accounts or opening state; responses reveal no private values | BR-01; NFR-01 | TEST-12 |

## F-04 Receive money

User goal: record salary received into an owned bank account. Select Receive money, the owned bank, date and total; allocate that total to the owned salary Income account; submit; retrieve the saved transaction and balances. Reject invalid input or inaccessible account references without financial effects.

Dependencies: F-01/F-03, D-03/D-04/D-07. UI: New transaction, Receive form, editable allocation lines and validation feedback. API: POST/GET /api/transactions and refreshed accounts/summary. Data: FinancialTransaction and AllocationLine in one database transaction. This Sprint 1 contract does not claim the later loan/transfer receive combinations are implemented.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-13 | Salary receipt is saved/retrieved with the correct bank and Income effect | FR-06/07/08; BR-05 | TEST-13 |
| AC-14 | Receive allocation total different from the transaction total is rejected; records and balances remain unchanged | BR-03/07 | TEST-14 |
| AC-15 | Required account types and ownership are checked for every primary/allocation reference before save | BR-01/04 | TEST-15 |
| AC-16 | Amount/date inputs obey D-03/D-04; invalid range/scale/sign/date is rejected without silent rounding or financial effects | BR-08/10 | TEST-16 |

## F-05 Payment or charge

User goal: record a 1,200 card purchase split between dining and groceries, then repay 500 from the bank. These are proposed fixture values. Purchase increases debt and Expense once; repayment reduces bank money and card debt without creating a second expense. Retrieve both records and their independent expected balances.

Dependencies: F-01/F-03, D-03/D-04/D-07 and the shared transaction model with F-04. UI/API/data use the same approved transaction interfaces and preserve distinct form semantics. Validate the complete allocation before committing. Database failure must roll back every persisted part.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-17 | Split card purchase persists both allocations; card debt and Expense change by the independent expected amounts | FR-05; BR-05 | TEST-17 |
| AC-18 | Bank-to-card repayment reduces bank balance and card debt; income/expense totals do not change | FR-05/07/08; BR-06 | TEST-18 |
| AC-19 | Mismatched payment allocations are rejected; no transaction, line or balance effect remains | BR-03/07 | TEST-19 |
| AC-20 | A failure during persistence rolls back all transaction/allocation writes; fresh API reads match the pre-request state | BR-07 | TEST-20 |
| AC-21 | User B and Administrator cannot retrieve or modify User A's transaction or inject an inaccessible allocation account | BR-01/02; NFR-01 | TEST-21 |

AC-15 and AC-16 also apply to payment/charge inputs, not only salary receipt.

## F-06 Balances, summaries and history

User goal: inspect the saved financial outcome and explain its sources. After opening balance, salary, split purchase and repayment, retrieve owned balances, income/expense summary and transaction history. The persisted detail exposes the correct allocation values. A later application restart must preserve these records. Summary period/date comparisons follow D-04.

Dependencies: F-01/F-03/F-04/F-05 and D-03/D-04/D-07. UI: Financial overview and history/detail, including loading/empty/failure feedback. API: owned accounts, transaction list/detail and summary. Reads scope ownership before aggregation. Later search/filter/category reporting is allocated in the plan.

| AC | Observable expected outcome | Requirements | STS |
| --- | --- | --- | --- |
| AC-22 | End-to-end fixture gives bank 29,500, card debt 700, Income 20,000 and Expense 1,200 under the proposed THB convention | FR-07/08; BR-05/06 | TEST-22 |
| AC-23 | Fresh history/detail reads return saved forms, totals and complete allocations in the approved stable order | FR-09; BR-01 | TEST-23 |
| AC-24 | Records at the approved opening/reporting boundaries are included/excluded exactly under D-04; invalid ranges fail safely | FR-08/09; BR-08 | TEST-24 |
| AC-25 | Required sign-in/transaction/history journeys have labelled keyboard-operable controls and usable loading/error/empty states at agreed widths | NFR-03 | TEST-25 |
| AC-26 | The same saved identifiers and financial values survive an actual local application restart; Lab 5 additionally verifies redeployment | NFR-02 | TEST-26 |
| AC-27 | Clean setup, safe seed, production build and documented tests work at an identified commit with placeholder configuration | NFR-04; BR-12 | TEST-27 |

## Product Definition of Done

- Resolve applicable D-01 to D-07 decisions and record the teammate-reviewed contract revision before dependent implementation.
- Implement the agreed behavior and backend permissions; execute planned unit/API/database and selected UI/E2E checks with meaningful assertions.
- Preserve intended red-before-green evidence for a financial rule and an access restriction; report every failed/skipped/unexecuted result honestly.
- Provide safe reproducible setup, migrations/seed, dependencies/environment examples and actual run/build/test commands.
- Obtain specific teammate reviews, integrate through sprint staging, run integration/acceptance checks and review the release into main.
- Record the immutable release, final test version, both students' contributions and known incomplete work. Complete Parts A-F in the report without old TokTickIT evidence.

## Contract and execution gates

| Gate | Actual evidence |
| --- | --- |
| Applicable decisions agreed by both students | |
| Contract/test-design revision before code | |
| Implementation Issues/branches and peer reviews | |
| Tests/build with exact commit and failures/skips | |
| Accepted main release | |
