# Software Requirements Specification

PocketLedger, draft 0.1, 7 November 2026. This baseline translates Theme 7 into identified requirements. Assignment-defined behavior is required; the policy choices in [team decisions](decisions.md) remain proposed and require team review before affected implementation.

## Context and actors

PocketLedger helps a person record where money is held, what is owed, where money came from and what it was spent on. One transaction may allocate its total across several financial accounts. The product must distinguish a purchase from the later repayment of its debt so that spending is not counted twice.

| Actor | Responsibility | Access boundary |
| --- | --- | --- |
| User | Maintain personal financial accounts and transactions; inspect balances, summaries and history | Own financial records only |
| Administrator | Manage platform user accounts and enable or disable access | No financial records or summaries, including other users' data |
| Anonymous visitor | Reach sign-in | No protected financial or administration operations |

A User Account is a sign-in identity. A Financial Account represents Cash, Loan Given, Loan Taken, Income or Expense. Bank and wallet accounts use Cash; a credit card uses Loan Taken. See [GLOSSARY](../GLOSSARY.md).

## Scope and exclusions

The complete three-sprint product covers the five financial account types, opening balances, both allocated transaction forms, balances/debt, income/expense and category summaries, history/search, correction, favourites and editable duplicates. It includes real authentication, backend permissions, a persistent database and, through Lab 5, Docker/GCP delivery.

Sprint 1 is the proposed usable journey described in the sprint plan, not the entire baseline. Real bank integration, real payments, shared/period budgets, automatic recurring transactions, external messaging, microservices and a separate cloud staging environment are outside the supplied scope. Seeded accounts can establish Sprint 1; authentication alone is insufficient.

## Functional requirements

| ID | Observable requirement | Planned feature |
| --- | --- | --- |
| FR-01 | A person can log in, obtain current-user identity and log out; protected operations require an enabled identity | F-01 |
| FR-02 | An Administrator can inspect platform user identities and enable or disable a user without reading their finances | F-02 |
| FR-03 | A User can create and manage owned financial accounts across all five account types | F-03 |
| FR-04 | A User can establish opening balances with a defined effective date and inspect their effect separately from income/expense | F-03 |
| FR-05 | A User can make a payment or record a charge from Cash or Loan Taken, allocating the total to the assignment-defined destination categories | F-05 |
| FR-06 | A User can receive money into Cash, allocating the total to income, loan repayments received, new borrowing or transfers | F-04 |
| FR-07 | A User can retrieve correct account balances, receivables and debts after a committed transaction | F-06 |
| FR-08 | A User can inspect income/expense and category summaries for a defined date range | F-06 |
| FR-09 | A User can retrieve transaction history and search/filter it using the approved later-sprint contract | F-06 |
| FR-10 | A User can correct a transaction with consistent balances and an explainable history | F-07 |
| FR-11 | A User can mark an existing transaction as a favourite and retrieve the favourite list | F-08 |
| FR-12 | A User can duplicate a transaction into a new editable draft without modifying the original | F-08 |

## Business rules

| ID | Required rule or proposed policy | Decision dependency |
| --- | --- | --- |
| BR-01 | Every financial read and write is restricted to the acting User's records, including every referenced allocation account | Assignment requirement |
| BR-02 | Administrators cannot view or modify financial accounts, transactions, favourites or summaries | Assignment requirement |
| BR-03 | Allocation amounts sum exactly to the transaction total | Assignment requirement |
| BR-04 | Each transaction form accepts only compatible primary/allocation account types | Assignment categories; detailed combinations D-03 |
| BR-05 | A committed transaction applies the documented changes to all affected balances | Assignment requirement; sign convention D-03 |
| BR-06 | Opening balances, transfers, borrowing and loan repayments do not become income or expense | Assignment requirement |
| BR-07 | Validation or persistence failure leaves no partial transaction or balance effect | Atomic design required for correct results; D-03/D-07 |
| BR-08 | Dates, opening cut-offs and reporting boundaries follow one explicit policy | D-04 |
| BR-09 | A duplicate is a separate editable record; saving it does not change the source | Assignment requirement; save/retry policy in later contract |
| BR-10 | Money precision, valid range, amount signs and rounding are explicit; invalid amounts are rejected without silent rounding | D-03 |
| BR-11 | Disabled identities cannot retain usable protected access under the agreed session lifecycle | D-05 |
| BR-12 | Re-running setup does not overwrite existing personal financial activity | Reproducibility safeguard |

## Non-functional requirements and verification targets

These proposed acceptance targets must be reviewed with the system design. They are measurable checks, not completed results.

| ID | Target | Verification and planned sprint |
| --- | --- | --- |
| NFR-01 | All protected endpoints enforce identity, role and ownership; passwords/session tokens are not stored or logged in plaintext | Negative API/database tests and configuration review, Sprint 1; regression thereafter |
| NFR-02 | A saved transaction and its balance effects survive an application restart and a subsequent deployment | Local persistence check in Sprint 1; same-record restart/redeploy evidence in Lab 5 |
| NFR-03 | Core sign-in and transaction journeys work by keyboard, have labelled fields and readable feedback, and fit 390, 768 and 1280 px widths without clipped controls | Selected UI/browser checks in Sprint 1; remaining screens by Sprint 3 |
| NFR-04 | A clean checkout can install locked dependencies, migrate/seed safely, build and execute documented tests using placeholder configuration | Independent setup check at every assessed release; Docker version in Lab 5 |

## Assumptions, decisions and acceptance boundary

The team has selected Theme 7 and the PocketLedger name. LEB2 group name is 2-Nor. Section, runtime, financial/date rules, session details, public interfaces and feature ownership remain in D-01 to D-07. The example fixture is proposed data, not an instructor-supplied calculation.

An accepted Sprint 1 requires the complete agreed journey, actual tests of rules/persistence/access, substantive teammate reviews and a tested release on main. A contract draft or a green documentation check does not establish working product behavior. Later requirements must remain allocated in the feature inventory even when not implemented in Sprint 1.
