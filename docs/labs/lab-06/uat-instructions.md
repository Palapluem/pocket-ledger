# PocketLedger Sprint 1 — UAT instructions for the testing team

**Status: prepared 23 November 2026; no case has been executed.** The expected results were checked against the application source code and the Sprint 1 contract; they have **not** yet been confirmed by a live walk-through (see the Product Team checklist in `product-team-handoff-checklist.md`). Fields marked **TBC** are filled in by the Product Team at handoff and must not be left blank when the pack is sent. Do not put credentials, tokens or other secret values in this file or in Git. They are delivered privately.

This document is the executable UAT plan for Lab 6 Part A. A tester should be able to run every case from this document alone, without verbal explanation. Execution results, defect reports and the final decision are recorded in the tester's own PDF/record, using the templates in sections 3, 6 and 8. The Product Team's PDF embeds sections 1 to 6 and 8 (cases, handoff and templates) with an evidence-ID index, rather than only linking to this file.

## 1. Handoff identity

| Field | Value |
| --- | --- |
| Product / team | PocketLedger, Theme 7 (Personal Money and Expense Logging System); Product Team 2-Nor (TH-013_P7): Wisit Suwannao (`Palapluem`) and Natthawat Primsirikunawut (`N0TAW00D`) |
| Repository | https://github.com/Palapluem/pocket-ledger (public) |
| Public URL | `https://pocket-ledger-468473091761.asia-southeast3.run.app` |
| Version under test | Source commit `37593da1cb3cd881e6b22845a2b4a929dbf6bc8e` (no Git tag is used; releases are identified by the full `main` commit). Cloud Run revision `pocket-ledger-00004-hxk` (informational: testers can only see the commit), 100% traffic, deploy run [44885832231](https://github.com/Palapluem/pocket-ledger/actions/runs/44885832231). |
| How to verify the version | Open `<URL>/api/health`. Expected: `{"status":"ok","database":"ok","commit":"37593da1cb3cd881e6b22845a2b4a929dbf6bc8e"}`. The page footer shows "PocketLedger · version" followed by the same full commit. **If the commit differs, stop and ask the Product Team before testing.** |
| Why `main` is newer than the tested commit | `main` has since advanced (documentation only, release PR #41 and PR #43). The deploy workflow does not run for documentation-only changes, so the live application still serves `37593da`. The application code is identical to the accepted Sprint 1 release `265c99596dd55f3ab91f5ea3db7632df05ab5a65` (`docs/releases.md`). |
| Accepted-for-test scope | Sprint 1 only: F-01 identity and access, F-02 platform user administration, F-03 seeded accounts and opening bank balance, F-04 salary receipt, F-05 split card charge and repayment, F-06 balances, summary and history (AC-01 to AC-28 in `docs/sprints/sprint-1/contract.md`). |
| Out of scope | Sprint 2/3 features: creating or managing accounts, transfers, borrowing, loans given, correction/edit of a transaction, search/filter, category reports, favourites, duplicate. Their absence is not a defect. |
| Product Team contact / test window | **TBC** (channel and agreed UAT, correction and re-test sessions) |
| Private credential channel | **TBC** (never in this PDF) |
| UAT Team and testers | **TBC** (names, student IDs, team; both students participate) |

### Coordination rules

- **Version changes.** The Product Team tells the UAT Team **before** deploying or restarting anything that could affect testing. A restart or redeploy of the **same commit** (a new Cloud Run revision with the same `/api/health` commit) is not a version change. If the commit changes during testing, stop, record the new commit, and treat later results as a separate run on the new version. Acceptance applies only to the recorded release.
- **Partner unavailable.** If the other team is unavailable or access to the application fails, notify the instructor/TA promptly and keep evidence of the notification (message and time). The instructor/TA arranges an alternative team or tester. The Product Team must not substitute its own testing for the required independent UAT. The same applies if a controlled defect exercise or replacement tester has not been provided: record the completed work and the unresolved dependency, and do not claim unperformed work.
- **Failed upstream case.** UAT-02, UAT-03, UAT-04, UAT-05 and UAT-07 depend on the state at the end of UAT-01. If UAT-01 fails or is BLOCKED, record those cases as **BLOCKED** ("upstream UAT-01"). You may additionally run them against the observed state, recomputing the expected values from the same rules and labelling the result "recomputed"; this does not replace the BLOCKED record.

### Accounts and roles

The Product Team delivers these synthetic accounts privately. In every record, use the label only.

| Label | Role | Used by | Notes |
| --- | --- | --- | --- |
| `UAT-A1` | User | UAT-01 to UAT-03, UAT-07, UAT-08 | Needs a fresh account with no financial activity. Holds the main fixture. |
| `UAT-B1` | User | UAT-04 | Fresh account with no activity; the "other user". |
| `UAT-ADMIN` | Administrator | UAT-05, UAT-06 | Must have no financial accounts. |
| `UAT-S1` | User | UAT-06, UAT-09, UAT-10 | Spare/fresh account. It is disabled and re-enabled in UAT-06. |
| `UAT-A2`, `UAT-B2`, `UAT-S2` | User | Re-test round | Fresh replacements, provisioned on request. See "Data setup and reset". |

Every User starts with five accounts: **Bank** (Cash), **Credit card** (Loan taken / card), **Salary** (Income), **Dining** and **Groceries** (Expense). Each has opening balance 0.00. Their opening date is the day the account was seeded.

### Data setup and reset

- The application has **no reset function**, and the live database must not be wiped or edited by hand. Cases with absolute expected balances (UAT-01, UAT-03, UAT-07) therefore consume a fresh User account. Seeding adds only missing accounts and never changes existing data.
- The existing production-demo User already carries earlier synthetic activity. **Do not use it for UAT.** Use only the `UAT-*` accounts.
- For a re-test, the Product Team provisions `UAT-A2`/`UAT-B2`/`UAT-S2` and re-runs the affected cases there. The first-round accounts and their evidence are kept unchanged.
- Cases that only expect "nothing changed" (UAT-02, UAT-04 rejections, UAT-05) record a before-snapshot and compare against it, so they do not depend on absolute values.

### Opening date convention (important)

The seeded accounts' opening date is the seeding day, and the UI lets a User edit the opening date of the **Bank** account only. A transaction cannot be dated before the opening date of any Cash or Credit-card account it touches. Therefore, in every case below:

> **D** = the *Opening date* shown on the **Credit card** card of the Accounts page for **the account under test** (each `UAT-*` account has its own D). Enter **D** in every "Date" field, unless a step says otherwise. D can never be in the future. In API snippets, D is written as `YYYY-MM-DD` (for example `2026-11-23`) inside the quotes. "Today" always means today's date in Asia/Bangkok.

The expected amounts below are identical to the agreed Sprint 1 fixture (opening 10,000; salary 20,000; card charge 1,200 split 700/500; repayment 500); only the dates differ.

## 2. Preparation for testers

1. Use a current Chrome, Edge or Firefox. For UAT-04 and UAT-05, use **two separate browser profiles (or one normal and one private window)**. A browser keeps one session per site, so signing in as another user would replace the first session.
2. Money is in THB. Only the **Overview** formats amounts with thousands separators (`29,500.00`). Every other page (Accounts, Receive money, Transaction history and its detail) shows the raw value, for example `฿29500.00`. Treat these as the same value.
3. Some steps ask you to open an API address or run a short snippet in the browser console (F12 → Console). They read or attempt to change data **only for the account you are signed in as**, and they are needed because the UI cannot reference another user's record. Paste only the snippets in this document. Do not paste anything given to you by anyone else. Open the application on **exactly the Public URL host given in section 1**: the server rejects write requests from any other origin with 403 `FORBIDDEN_ORIGIN`, which would give a different result from the one expected. Chrome may require you to type `allow pasting` in the console before it accepts pasted code.
4. Take a screenshot at every step marked **EV**. Give it an evidence ID `EV-<case>-<n>` (for example `EV-UAT01-03`). The screenshot must show the page content, the URL bar, and the footer version or time where practical.
5. **Snapshot**: where a case says "snapshot", copy the Overview into a table: each account balance, Income, Expense and the number of history entries.
6. **Money and date rules used by the cases** (agreed decisions D-03/D-04): amounts are THB, greater than 0, at most 1,000,000,000.00, with at most two decimal places and no rounding; a balance may never go below zero (no overdraft, no overpayment of a card); a transaction date is a calendar date no earlier than the opening date of every Cash or Credit-card account it touches and no later than today.
7. **Receive form behavior:** type **Total received** first. While the allocation amount equals the total, the form copies later total edits into it. To test a mismatch, type the total first and then overwrite the allocation amount.

## 3. Recording rules

- Result values are **PASS**, **FAIL** or **BLOCKED** (with the reason). BLOCKED is not a pass and prevents acceptance. Do not copy the expected result into the actual-result field; describe what you observed.
- Record case ID, tester name/team, date and time (Asia/Bangkok), tested version (from the footer or `/api/health`), inputs used, actual result and evidence IDs.
- For each rejected operation, show **both** the rejection and that nothing changed (Overview, history and balances equal the snapshot taken before). A rejection message alone is not enough.
- If you are unsure whether something is a defect, record the observation, keep the evidence and report it. The Product Team triages it. Do not stop testing other cases.

### Execution record template (one row per case and run)

| Case | Tester / team | Date and time | Version | Inputs / account label | Actual result | Evidence IDs | PASS / FAIL / BLOCKED | Defect ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | |

### Recommended run order

`UAT-08` → `UAT-01` → `UAT-02` → `UAT-03` → `UAT-07` part A → `UAT-04` → `UAT-05` → `UAT-06` → `UAT-09` → `UAT-10` → `UAT-07` part B (when the Product Team announces a restart or redeploy).

Dependencies: UAT-02 and UAT-03 expect the state at the end of UAT-01. UAT-04 and UAT-05 need the account and transaction IDs of `UAT-A1` read after UAT-01. UAT-07 needs UAT-01 (see "Failed upstream case" in section 1). Everything else is independent.

## 4. Cases

### Coverage

| Case | Category | Sprint 1 requirement / AC | Role |
| --- | --- | --- | --- |
| UAT-01 | Normal domain journey | FR-04/06/05/07/08; AC-10, 11, 13, 17, 18, 22 | User |
| UAT-02 | Business rule: allocation | BR-03/07; AC-14, 19 | User |
| UAT-03 | Business rule: boundaries | BR-08/10; AC-10 (date not before opening), AC-16, AC-24 (D-03/D-04) | User |
| UAT-04 | Forbidden: ownership | BR-01; AC-12, 21; AC-15 (foreign references only) | User B vs User A |
| UAT-05 | Forbidden: Administrator and role boundary | BR-02; AC-07, 08, 21 | Administrator, User |
| UAT-06 | Administration | FR-02/BR-11; AC-05; AC-06 (**partial**: enable/disable persistence; last-administrator safeguard excluded) | Administrator |
| UAT-07 | State, history, persistence | FR-09, NFR-02; AC-23, 26 (part B) | User |
| UAT-08 | Identity and access | FR-01; AC-01 to 04 | All |
| UAT-09 | Safe repeat submission | BR-13; AC-28 | User |
| UAT-10 | Keyboard, feedback, width | NFR-03; AC-25 | User |

Not covered by manual UAT (developer-test evidence only, not claimed here): AC-09 (seed rerun), AC-20 (persistence-failure rollback needs fault injection), AC-27 (clean checkout setup), the account-**type** compatibility part of AC-15 (the forms offer only valid account types, so an invalid type cannot be provoked in the UI) and the last-administrator safeguard of AC-06.

---

### UAT-01 — Complete Sprint 1 money journey

- **Purpose:** The core Theme 7 journey gives the independently calculated balances.
- **Role / account:** User, `UAT-A1` (fresh). **Depends on:** none (first money case).
- **Inputs (synthetic):** opening bank 10,000.00; salary 20,000.00; card charge 1,200.00 = Dining 700.00 + Groceries 500.00; repayment 500.00 from Bank to Credit card. Date **D** everywhere.

| # | User action | Expected result |
| --- | --- | --- |
| 1 | Sign in as `UAT-A1`. Note **D** from Accounts → Credit card → *Opening date*. | Overview titled "Signed in", showing the display name and "User". Bank, Credit card, Salary, Dining, Groceries all 0.00; Income 0.00; Expense 0.00; "No transactions yet." **EV** |
| 2 | Accounts → Bank → *Opening balance*: Amount `10000.00`, Effective date **D** → **Save opening balance**. | Status "Opening balance saved and retrieved from the account record." Bank shows opening 10000.00 and current 10000.00 (Accounts page may omit separators). **EV** |
| 3 | Open Overview. | Bank 10,000.00; Income 0.00; Expense 0.00; history still empty (the opening balance is **not** income). |
| 4 | **Receive money**: Cash account *Bank*, *Date received* **D**, *Total received (THB)* `20000.00`, Income account *Salary*, *Allocation 1 amount (THB)* `20000.00` (type the total first; the allocation follows it) → **Save receipt**. | The button changes to "Saved" and a success status appears. **EV** |
| 5 | Open Overview. | Bank **30,000.00**; Salary 20,000.00; Income **20,000.00**; Expense 0.00; 1 history entry reading "**D** · Received into Bank" with amount 20,000.00 and the allocation line "Salary: 20,000.00". |
| 6 | **Make a payment or record a charge**: *Pay from or charge to* = "Credit card (Loan taken / card)"; Date **D**; Total `1200.00`; Line 1 account "Dining (Expense)" amount `700.00`; **Add line**; Line 2 "Groceries (Expense)" amount `500.00`. Confirm the text "Allocated 1,200.00 of 1,200.00". **Save**. | Redirect to Overview. Credit card **1,200.00** (debt); Dining 700.00; Groceries 500.00; Expense **1,200.00**; Income 20,000.00; Bank 30,000.00 unchanged. **EV** |
| 7 | Make a payment: *Pay from* "Bank (Cash / bank)"; Date **D**; Total `500.00`; Line 1 account "Credit card (Loan taken / card)" amount `500.00`. **Save**. | Overview: Bank **29,500.00**; Credit card **700.00**; Income **20,000.00**; Expense **1,200.00** (no second expense from the repayment); Dining 700.00; Groceries 500.00; Salary 20,000.00. **EV** |
| 8 | Open **Transaction history**. For each row click the button named "View **D** transaction" (the three buttons have the same name because the dates are equal; work from the top row down). | Three rows, all dated **D**, ordered by date and then by creation time, newest first: Payment (repayment 500.00), Payment (charge 1,200.00), Receive (salary 20,000.00). The detail card shows Type `RECEIVE`/`PAYMENT`, Primary account, Total and Allocations, with raw amounts such as `฿20000.00`. Salary receipt: total 20000.00, allocation Salary 20000.00. Card charge: primary Credit card, total 1200.00, Dining 700.00 + Groceries 500.00. Repayment: primary Bank, total 500.00, allocation Credit card 500.00. **EV** |
| 9 | Open `<URL>/api/transactions` in the address bar. Copy the three `id` values and open `<URL>/api/accounts`; copy the `id` of Bank and Dining into your notes (needed by UAT-04/05/07). | JSON arrays containing only `UAT-A1`'s records. Values equal step 8. |

**Pass criteria:** every expected balance matches exactly. Final state: **Bank 29,500.00; Credit card 700.00; Salary/Income 20,000.00; Dining 700.00; Groceries 500.00; Expense 1,200.00; 3 history entries.**

**Independent calculation:** Bank 10,000 + 20,000 − 500 = 29,500. Card debt 1,200 − 500 = 700. Income 20,000. Expense 700 + 500 = 1,200 (the repayment is not an expense).

---

### UAT-02 — Reject an invalid allocation

- **Role / account:** `UAT-A1`, state at the end of UAT-01 (any state works; this case compares with its own snapshot).
- **Preconditions:** take **Snapshot S0** of the Overview.

| # | User action | Expected result |
| --- | --- | --- |
| 1 | Payment form: *Credit card*, date **D**, Total `1200.00`, Line 1 Dining `700.00`, Line 2 Groceries `400.00`. Observe the live text, then **Save**. | The text shows "Allocated 1,100.00 of 1,200.00". After Save an alert shows "Allocations must add up exactly to the total." The form stays on screen with the entered values. **EV** |
| 2 | Open Overview and Transaction history. | Equal to S0 in every balance, Income, Expense, and number of entries. **EV** |
| 3 | **Receive money**: Bank, date **D**, Total received `100.00`; then overwrite the Salary allocation amount with `99.00` → **Save receipt**. | An alert shows "Allocations must add up exactly to the total." No "Saved" status. The entered values stay. |
| 4 | Open Overview and Transaction history again. | Equal to S0. **EV** |

**Pass criteria:** both submissions are rejected with a useful message and no transaction, allocation or balance change is visible.

---

### UAT-03 — Money and date boundaries

- **Role / account:** `UAT-A1`, at the state at the end of UAT-01 and UAT-02 (Bank 29,500.00; Credit card debt 700.00). Take **Snapshot S1** first. Each row is a separate attempt; after **each** rejection confirm that the page still shows no new history entry.

| # | Attempt | Expected result |
| --- | --- | --- |
| 1 | Overpay the card: pay from Bank, total `700.01`, line Credit card `700.01`, date **D**. | Rejected: "This would make an account balance negative." (debt may not go below zero). **EV** |
| 2 | Overdraw the bank: pay from Bank, total `29500.01`, line Dining `29500.01`, date **D**. | Rejected with the same message. **EV** |
| 3 | Too many decimals: Receive money, Total `10.001`, Salary `10.001` (total first, so the allocation follows). | Alert "Check the form, account, date and amounts (greater than 0, at most two decimals)." Nothing saved and the amount is not rounded to 10.00. |
| 4 | Zero amount: Receive money, Total `0.00`, Salary `0.00`. | The same alert; nothing saved. |
| 5 | Negative amount: Receive money, Total `-5.00`, Salary `-5.00`. | The same alert; nothing saved. |
| 6 | Above the maximum: Receive money, Total `1000000000.01`, Salary `1000000000.01`. | The same alert; nothing saved. |
| 7 | Before the opening date: pay from Bank, total `1.00`, Dining `1.00`, date = the day **before D**. | Rejected: "The date cannot be before an affected account's opening date." **EV** |
| 8 | After today: (a) on the payment form, try to pick tomorrow's date; (b) on the Receive money form, enter tomorrow's date (Bangkok) by typing it, with Bank, Total `1.00`, Salary `1.00`, and save. | (a) The date picker greys out future days, and if a future date is typed the browser blocks the submission; no request is sent. (b) Alert "The date cannot be later than today." Nothing is saved in either case. |
| 9 | Compare the Overview and history with S1. | **Identical to S1.** |

**Pass criteria:** every attempt is refused without any change to balances, Income, Expense or history.

---

### UAT-04 — Another user cannot read or change this user's records

- **Roles / accounts:** `UAT-A1` (the owner, with the UAT-01 data) and `UAT-B1` (fresh), in two separate browser profiles.
- **Preconditions:** you have `UAT-A1`'s Bank account id (`A_BANK_ID`), Dining account id (`A_DINING_ID`) and one transaction id (`A_TXN_ID`) from UAT-01 step 9. Take a **snapshot of `UAT-A1`** (Overview and the Bank card's opening balance 10000.00). Open the application on the exact Public URL host (section 2, item 3), because the snippets below are write requests.

| # | User action | Expected result |
| --- | --- | --- |
| 1 | Profile 2: sign in as `UAT-B1`. Look at Overview, Accounts and Transaction history. | Only B1's own five accounts, all 0.00, "No transactions yet." None of A1's amounts or records appear. **EV** |
| 2 | As B1, note B1's Credit card id (`B_CARD_ID`) from `<URL>/api/accounts`. Then open `<URL>/api/transactions/A_TXN_ID`. | HTTP 404 with JSON `{"code":"NOT_FOUND", …}`. The body contains no amount, account name, owner or other detail about A1's record. **EV** |
| 3 | As B1, open `<URL>/api/accounts/A_BANK_ID`. | 404 `NOT_FOUND`, no private data. |
| 4 | As B1, run in the console: `await fetch('/api/accounts/A_BANK_ID/opening-balance',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:'1.00',date:'D'})}).then(async r=>[r.status,await r.json()])` (replace `A_BANK_ID` and `D`). | `[404, {code:"NOT_FOUND", …}]`. **EV** |
| 5 | As B1, run: `await fetch('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({form:'PAYMENT',primaryAccountId:'B_CARD_ID',date:'D',total:'10.00',allocations:[{accountId:'A_DINING_ID',amount:'10.00'}]})}).then(async r=>[r.status,await r.json()])` (replace placeholders). | `[404, {code:"NOT_FOUND", …}]` — A1's Dining account cannot be used as an allocation line. **EV** |
| 6 | As B1, reload Overview and Transaction history. | Unchanged: all 0.00, no history. |
| 7 | Profile 1: as A1 reload Overview and Accounts. | A1's snapshot is **unchanged**: Bank 29,500.00; opening balance 10000.00; Dining 700.00; 3 history entries. No 10.00 appears. **EV** |
| 8 | Sign out of B1. Open `<URL>/api/summary`. | 401 `UNAUTHENTICATED`, no data. |

**Pass criteria:** every cross-user read/write is refused with the same not-found answer, exposes no private value, and leaves both users' data unchanged.

---

### UAT-05 — Administrator privacy boundary and role boundary

- **Roles / accounts:** `UAT-ADMIN`; `UAT-A1` for the role check and for the unchanged-state check. Needs `A_BANK_ID`, `A_DINING_ID` and `A_TXN_ID` from UAT-01 step 9. Use the exact Public URL host (section 2, item 3).

| # | User action | Expected result |
| --- | --- | --- |
| 1 | Sign in as `UAT-ADMIN`. | "Signed in", the display name and "Administrator". The only navigation items are **Manage users** and **Sign out**. No balances, income, expense or history. **EV** |
| 2 | Open **Manage users**. | Table with Name, Email, Role, Status and an Enable/Disable action. It contains **no** financial values. |
| 3 | Open `<URL>/accounts`, `<URL>/transactions`, `<URL>/transactions/receive` and `<URL>/transactions/new` directly. | Each redirects to the Administrator's Overview (the page described in step 1). No account or transaction data is shown. **EV** |
| 4 | Open each in the address bar: `<URL>/api/accounts`, `<URL>/api/transactions`, `<URL>/api/summary`, `<URL>/api/transactions/A_TXN_ID`. | HTTP 403 `FORBIDDEN` for each. No balance, amount, account or transaction value is returned. **EV** |
| 5 | As Administrator, run in the console two write attempts: `await fetch('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({form:'PAYMENT',primaryAccountId:'A_BANK_ID',date:'D',total:'1.00',allocations:[{accountId:'A_DINING_ID',amount:'1.00'}]})}).then(async r=>[r.status,await r.json()])` and `await fetch('/api/accounts/A_BANK_ID/opening-balance',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:'1.00',date:'D'})}).then(async r=>[r.status,await r.json()])` (replace the placeholders; D is `UAT-A1`'s date). | Both return `[403, {code:"FORBIDDEN", …}]`. **EV** |
| 6 | Open `<URL>/api/admin/users`. | JSON listing only identity fields (id, display name, email, role, enabled). No password, hash, token or financial field. |
| 7 | Sign out. Sign in as `UAT-A1`. Open Overview and Accounts. | `UAT-A1`'s state equals the state at the end of UAT-03: Bank 29,500.00, opening balance 10000.00, no extra transaction. The Administrator's write attempts changed nothing. **EV** |
| 8 | As `UAT-A1` open `<URL>/admin/users`, then `<URL>/api/admin/users`. | The page shows "Only an administrator can manage users." with no user list. The API returns 403. A User can neither list nor change platform users. **EV** |

**Pass criteria:** the Administrator never sees or changes financial data or summaries; a User cannot reach administration.

---

### UAT-06 — Enable and disable a user (Administrator)

- **Role / accounts:** `UAT-ADMIN` acting on `UAT-S1`. **Do not disable `UAT-ADMIN`.**

| # | User action | Expected result |
| --- | --- | --- |
| 1 | Sign in as `UAT-ADMIN` → Manage users. Find the `UAT-S1` row. | The row shows Status "Enabled" and a **Disable** button. **EV** |
| 2 | Click **Disable** on the `UAT-S1` row. Reload the page. | Status shows "Disabled" after the reload as well, so the change persisted. **EV** |
| 3 | In the other profile, try to sign in as `UAT-S1`. | Sign-in is refused with "Invalid email or password." and you stay on the sign-in page. No financial data is shown. **EV** |
| 4 | As Administrator click **Enable** on the `UAT-S1` row. Reload. | Status "Enabled". |
| 5 | Sign in as `UAT-S1` again. | Sign-in succeeds. |

**Pass criteria:** the state change is persisted and enforced at sign-in, and is reversible. The "last enabled administrator cannot be disabled" safeguard (AC-06) is **not** run by testers, because a defective result could lock the UAT out. It is covered by developer test TEST-06 and is not claimed here.

---

### UAT-07 — History and saved values persist

- **Role / account:** `UAT-A1` with the UAT-01 data.
- **Part A (new session):**

| # | User action | Expected result |
| --- | --- | --- |
| A1 | Record `<URL>/api/transactions` (ids, totals, allocations). Sign out and close the browser completely. | |
| A2 | Open a new browser, sign in as `UAT-A1`. Open `<URL>/api/transactions`, the Overview and **Transaction history** (open each "View **D** transaction" detail). | The same three transaction ids, totals, forms and allocations as UAT-01 step 8 and A1. Balances still Bank 29,500.00, Credit card 700.00, Income 20,000.00, Expense 1,200.00. Order is stable (newest first). **EV** |

- **Part B (after an actual application restart) — required for AC-26:** the Product Team commits to restart the application **on the same commit** during the test window (a new Cloud Run revision with an unchanged `/api/health` commit; not a version change, section 1) and announces it **in advance**. Before the restart record the `/api/health` commit and the ids from A1. After the Product Team confirms the restart, sign in as `UAT-A1` and repeat A2. Expected: the same ids and values, and the same commit in `/api/health`. If no restart is arranged, record Part B as **BLOCKED** and notify the instructor/TA; do not report it as executed. If the commit changes instead, follow the version-change rule in section 1.

---

### UAT-08 — Sign-in, sign-out and anonymous access

| # | User action | Expected result |
| --- | --- | --- |
| 1 | Open `<URL>/login`. Sign in as `UAT-A1` with a **wrong** password. | Stay on the sign-in page. Alert "Invalid email or password." No Overview or private data. **EV** |
| 2 | Try an unknown but validly formatted email address (for example `nobody@example.com`) with any password. A malformed address is blocked by the browser before any request. | The same alert as step 1 (it does not reveal whether the email exists). |
| 3 | Sign in as `UAT-A1` with the correct password. | Overview as "User". |
| 4 | **Sign out**. Click the browser's Back button. | No private data is displayed; the sign-in page is shown or the data fails to load. |
| 5 | Signed out, open `<URL>/overview`. | Redirect to `/login`. |
| 6 | Signed out, open `<URL>/api/accounts`, `<URL>/api/transactions` and `<URL>/api/summary`. | 401 `UNAUTHENTICATED`, no data. **EV** |

---

### UAT-09 — A double click saves one record

- **Role / account:** `UAT-S1` (re-enabled in UAT-06). Take a snapshot **S** (Bank balance `Bank0`, Income, history count). **D** is the Opening date on `UAT-S1`'s own Credit card card. The expectations are relative to the snapshot, so a repeated attempt on the same account is allowed (take a new snapshot first).

| # | User action | Expected result |
| --- | --- | --- |
| 1 | **Receive money**: Bank, date **D**, Total `100.00`, Salary `100.00`. **Double-click** *Save receipt* quickly. | The button shows "Saving…" briefly (it may be too fast to see), then "Saved", and a second click has no effect. |
| 2 | Open Transaction history and Overview. | **Exactly one** new entry of 100.00 compared with S. Bank = `Bank0` + 100.00; Income = S + 100.00. **EV** |

If no real double click can be produced reliably, record **BLOCKED** with the reason. Do not mark it as a pass. If the response is lost or unclear, the page tells you to check the transaction history before submitting again. (The server has no duplicate protection; see section 5.)

---

### UAT-10 — Keyboard use, feedback and screen width

- **Role / account:** steps 1–2 `UAT-S1` or `UAT-A1`; step 3 `UAT-B1` (the only account that still has no transaction after UAT-04, because all its write attempts were rejected).

| # | User action | Expected result |
| --- | --- | --- |
| 1 | Sign in using only the keyboard (Tab, Enter, space). | All fields and buttons are reachable in a logical order, the focus is visible, and each field has a label. |
| 2 | Using the browser's responsive mode, set widths 390, 768 and 1280 px. On each, open Sign-in, Overview, Accounts, Receive money, the payment form and Transaction history. | No horizontal page scroll, and no clipped or overlapping control or text. **EV** (390 px for the payment form) |
| 3 | Signed in as `UAT-B1`, open Overview and then Transaction history. | Overview shows "No transactions yet."; Transaction history shows "No transactions have been recorded yet." |

## 5. Known behaviors that are **not** defects

These limits are agreed Sprint 1 decisions and are disclosed. Record any additional observation as a finding anyway; the Product Team will classify it.

| Behavior | Source |
| --- | --- |
| A sign-in token lasts 3600 seconds and is not revoked on sign-out or when a user is disabled. A copied token keeps working until it expires; disabling a user blocks only new sign-ins. | D-05 |
| No formal Origin/CSRF request-protection policy yet (deferred and disclosed). | D-05 |
| There is no server-side duplicate protection (idempotency key). A deliberate repeat submission, or a resend after an unclear result, can create a second record. The pages prevent accidental double submission and never retry automatically. | D-04, BR-13 |
| Only the seeded five accounts exist. There is no screen to create accounts, and the opening balance can be edited for the Bank only. | D-06; Sprint 2 |
| The Receive form supports salary into Cash (Income allocation) only; the payment form supports the card charge and bank payment/repayment combinations. Transfers, borrowing and loans given are Sprint 2. | Sprint 1 contract |
| No search, filter, correction, favourites or duplicate. | Sprint 2/3 |
| There is no editing or deleting of a saved transaction. | Sprint 2 |

## 6. Defect report template

Report each reproducible failure to the Product Team through the agreed channel, one report per failure.

| Field | Content |
| --- | --- |
| Issue ID | Your own ID (for example `UAT-DEF-01`) |
| Product owner / team | PocketLedger, Product Team 2-Nor |
| Reporter and date/time | |
| Tested version | Commit/revision from `/api/health` or the footer |
| Linked case and requirement/AC | For example UAT-03 step 1; AC-16 |
| Preconditions and data | Account label, state before the failure (snapshot) |
| Reproduction steps | Numbered, starting from sign-in |
| Expected result | With the contract reference |
| Actual result | What happened, including any message text |
| Severity and reason | Explain by user impact (see below) |
| Evidence | Evidence IDs and screenshots |
| Specified behavior or new feature? | Say whether the contract requires the behavior. Never relabel a failing requirement as an enhancement. |

**Severity guide (by user impact):**

| Severity | Meaning | Effect on acceptance |
| --- | --- | --- |
| Critical | Exposes or changes another user's data, lets the Administrator reach financial data, loses or corrupts money data, wrong balances in the core journey, or nobody can sign in | Blocks acceptance; must be fixed and re-tested |
| Major | A required Sprint 1 behavior or rule does not work or is not enforced, with no reasonable workaround | Blocks acceptance; must be fixed and re-tested |
| Minor | Cosmetic, wording or small usability issue; the result is correct | Fixed, or explicitly accepted by the UAT Team as a documented limitation |

## 7. Re-test

1. The Product Team gives the UAT Team the corrected version (commit, revision, release PR) **before** deploying anything that could affect testing.
2. For each corrected critical/major defect, repeat the original failed case and its reproduction steps on the corrected version, on fresh accounts (`UAT-A2`, `UAT-B2`, `UAT-S2`) where the case has absolute values. Re-run the other cases that touch the same behavior.
3. Record tester, version, date/time, actual result and evidence, as in section 3.
4. A different team member than the original reporter may repeat a case, but both students must take part in the UAT overall.

## 8. Final acceptance decision (UAT Team only)

Only the UAT Team completes this section, based on its own evidence. The Product Team must not complete or alter it.

| Field | Value |
| --- | --- |
| Decision | **Accepted** / **Accepted with documented minor limitations** / **Not Accepted** |
| Release tested (commit and revision) | |
| Independent UAT testers (names, team) | |
| Date | |
| Cases executed (PASS / FAIL / BLOCKED counts) | |
| Open defects and limitations accepted | |
| Reasons and conditions | |

**Decision rules:** report **Not Accepted** if any critical or major defect is unresolved or has not been independently re-tested, or if any required case is BLOCKED or not run. Minor defects must be fixed or explicitly accepted as documented limitations. Acceptance applies only to the release and Sprint 1 scope recorded above.

