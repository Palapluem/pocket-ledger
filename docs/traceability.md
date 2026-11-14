# Requirements and verification traceability

Draft 0.2, 7 November 2026, updated 15 November. This is the single requirements coverage matrix. Planned AC/test links refer to the D-01 to D-07 Sprint 1 baseline agreed on 15 November; PR #15 formal review and merge remain pending. Financial behavior remains NOT RUN. Partial authentication and administration results are identified below and detailed in the STS. Actual files, commands and tested commits belong in the STS result record.

| Requirement | Feature / responsibility | Planned sprint and AC / verification | Current result |
| --- | --- | --- | --- |
| FR-01 | F-01 | S1 AC-01 to AC-05; TEST-01 to TEST-05 | PARTIAL: session API tests reported for PRs #12/#14; UI and complete S1 verification remain pending; see STS |
| FR-02 | F-02 | S1 AC-06/07/08; TEST-06/07/08 | PARTIAL: administration API tests reported for PR #14; UI and financial-route isolation TEST-08 remain pending; see STS |
| FR-03 | F-03 | S1 AC-09/12 for seeded accounts; S2 account-management contract | NOT RUN; full management pending S2 |
| FR-04 | F-03 | S1 AC-10/11; TEST-10/11; remaining opening policy S2 | NOT RUN |
| FR-05 | F-05 | S1 AC-17 to AC-21; TEST-17 to TEST-21; full combinations S2 | NOT RUN |
| FR-06 | F-04 | S1 AC-13 to AC-16/21; TEST-13 to TEST-16/21; full forms S2 | NOT RUN |
| FR-07 | F-06 | S1 AC-22; TEST-22 | NOT RUN |
| FR-08 | F-06 | S1 AC-22/24; TEST-22/24; category detail S2 | NOT RUN |
| FR-09 | F-06 | S1 AC-23; TEST-23; search/filter S2 | NOT RUN |
| FR-10 | F-07 | S2 correction contract and regression verification | NOT SPECIFIED FOR IMPLEMENTATION |
| FR-11 | F-08 | S3 favourite contract and ownership verification | NOT SPECIFIED FOR IMPLEMENTATION |
| FR-12 | F-08 | S3 duplicate contract and independent-save verification | NOT SPECIFIED FOR IMPLEMENTATION |
| BR-01 | F-01 to F-08 | S1 AC-03/12/15/21; later contracts repeat relevant ownership coverage | NOT RUN |
| BR-02 | F-01/02/06 and all financial APIs | S1 AC-08/21; TEST-08/21 | NOT RUN |
| BR-03 | F-04/05 | S1 AC-14/19; TEST-14/19 | NOT RUN |
| BR-04 | F-04/05 | S1 AC-15; TEST-15; full matrix S2 | NOT RUN; D-03 compatibility policy accepted; full matrix S2 |
| BR-05 | F-03 to F-07 | S1 AC-10/13/17/18/22; independently calculated fixture | NOT RUN |
| BR-06 | F-03 to F-07 | S1 AC-11/18/22; later transfer/borrowing cases S2 | NOT RUN |
| BR-07 | F-04/05/07 | S1 AC-20; TEST-20 against real test database | NOT RUN |
| BR-08 | F-03 to F-07 | S1 AC-24; TEST-24 under D-04 | NOT RUN; D-04 date policy accepted; executable checks pending |
| BR-09 | F-08 | S3 duplicate contract and original-record comparison | NOT SPECIFIED FOR IMPLEMENTATION |
| BR-10 | F-03 to F-07 | S1 AC-16; TEST-16 under D-03 | NOT RUN; D-03 amount limits accepted; executable checks pending |
| BR-11 | F-01/02 | S1 AC-05/06; TEST-05/06 | PARTIAL: authentication/administration API results are recorded in the STS; remaining checks pending. D-05 token limits, 3600 s, HS256/`jose` and key management accepted; Origin/CSRF policy deferred until deployment review |
| BR-12 | F-03 / setup | S1 AC-09/27; TEST-09/27 | NOT RUN |
| BR-13 | F-04/05 | S1 AC-28; TEST-28 | NOT RUN; client-side duplicate-submit/no-auto-retry behavior planned; server exactly-once guarantee is not part of Sprint 1 |
| NFR-01 | F-01/02; all protected interfaces | S1 AC-02/03/04/05/07/08/12/21; security regression each release | PARTIAL: identity and administration API checks are reported in the STS; financial ownership/isolation checks and full regression remain NOT RUN |
| NFR-02 | F-03/04/05/06; delivery | S1 AC-26; TEST-26; Lab 5 C-05 restart and redeploy | NOT RUN |
| NFR-03 | All UI features | S1 AC-25/28; TEST-25/28; remaining screens by S3 | NOT RUN |
| NFR-04 | Reproduction and delivery | S1 AC-27; TEST-27; Lab 5 C-03 clean container build | NOT RUN |

## Coverage review

Every identified baseline requirement has a feature/responsibility and a planned sprint. This is coverage of the plan, not proof of implementation. Later-sprint AC and executable tests are elaborated before that feature's implementation. Review any added/changed requirement against this matrix and the feature inventory together.
