# Requirements and verification traceability

Draft 0.1, 7 November 2026. This is the single requirements coverage matrix. Planned AC/test links refer to draft contracts; all execution is NOT RUN. Actual files, commands and tested commits belong in the STS result record when tests exist.

| Requirement | Feature / responsibility | Planned sprint and AC / verification | Current result |
| --- | --- | --- | --- |
| FR-01 | F-01 | S1 AC-01 to AC-05; TEST-01 to TEST-05 | NOT RUN |
| FR-02 | F-02 | S1 AC-06/07/08; TEST-06/07/08 | NOT RUN |
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
| BR-04 | F-04/05 | S1 AC-15; TEST-15; full matrix S2 | NOT RUN; D-03 open |
| BR-05 | F-03 to F-07 | S1 AC-10/13/17/18/22; independently calculated fixture | NOT RUN |
| BR-06 | F-03 to F-07 | S1 AC-11/18/22; later transfer/borrowing cases S2 | NOT RUN |
| BR-07 | F-04/05/07 | S1 AC-20; TEST-20 against real test database | NOT RUN |
| BR-08 | F-03 to F-07 | S1 AC-24; TEST-24 after D-04 | NOT RUN; policy open |
| BR-09 | F-08 | S3 duplicate contract and original-record comparison | NOT SPECIFIED FOR IMPLEMENTATION |
| BR-10 | F-03 to F-07 | S1 AC-16; TEST-16 after D-03 | NOT RUN; limits open |
| BR-11 | F-01/02 | S1 AC-05/06; TEST-05/06 | NOT RUN; D-05 JWT limits accepted; 3600 s lifetime and HS256/`jose` approved; key handling recorded in D-05; request-protection mechanism open |
| BR-12 | F-03 / setup | S1 AC-09/27; TEST-09/27 | NOT RUN |
| NFR-01 | F-01/02; all protected interfaces | S1 AC-02/03/04/05/07/08/12/21; security regression each release | NOT RUN |
| NFR-02 | F-03/04/05/06; delivery | S1 AC-26; TEST-26; Lab 5 C-05 restart and redeploy | NOT RUN |
| NFR-03 | All UI features | S1 AC-25; TEST-25; remaining screens by S3 | NOT RUN |
| NFR-04 | Reproduction and delivery | S1 AC-27; TEST-27; Lab 5 C-03 clean container build | NOT RUN |

## Coverage review

Every identified baseline requirement has a feature/responsibility and a planned sprint. This is coverage of the plan, not proof of implementation. Later-sprint AC and executable tests are elaborated before that feature's implementation. Review any added/changed requirement against this matrix and the feature inventory together.
