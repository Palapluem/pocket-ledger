# Release and verification register

Both Sprint 1 releases below were promoted by a reviewed `sprint-1-staging` → `main` PR that the teammate approved and merged. The initial documentation bootstrap (`a4cced2`) is not a release.

| Accepted release / assessment | Main tag / full commit | Source tested and result/run | Integration and release PRs | Image digest / running revision | Deployment / smoke / UAT evidence |
| --- | --- | --- | --- | --- | --- |
| Sprint 1 first release (Lab 5 first deploy) | `bbf7c4a168b6b3585c4e973bb78faf7f233fd11b` | Release PR CI [#64](https://github.com/Palapluem/pocket-ledger/actions/runs/43905359658); main CI [#66](https://github.com/Palapluem/pocket-ledger/actions/runs/43911059795) | Integrations #18, #19, #22, #23, #25, #27; release #28 | `sha256:83a5c319aa4259b8a75521fce5af17a07c2dba195ee0d54f1aae41ca355851a6`; revisions `pocket-ledger-00001-dnf`, and `pocket-ledger-00002-r2w` after the Lab 5 restart check | [Deploy 43911059895](https://github.com/Palapluem/pocket-ledger/actions/runs/43911059895) smoke passed; Lab 5 C-04 and C-05 (restart) in `docs/labs/lab-05/deployment.md` |
| **Sprint 1 accepted release (PD1 / Lab 5 final)** | `265c99596dd55f3ab91f5ea3db7632df05ab5a65` | Release PR #32 `build-test` (runs 44551484832, 44551469216 on `c7109e9`); main CI [44563996778](https://github.com/Palapluem/pocket-ledger/actions/runs/44563996778); clean-checkout TEST-27 (20 Nov): 131 server / 13 E2E tests passed | Integrations #29, #30, #31, #33; release #32. Application code is unchanged from `bbf7c4a`; the release adds Lab 5 tooling, tests, docs and the docs-only deploy filter | Push digest `sha256:df61eee957b04694aef8a1e9c2234f52bc693944060a98b3292daffae3a837df`; revision `pocket-ledger-00003-5rh` (100% traffic) | [Deploy 44563996620](https://github.com/Palapluem/pocket-ledger/actions/runs/44563996620) smoke passed; Lab 5 C-05 after redeploy: 14/14, with `/api/health` reporting `265c995` |

Keep the original Sprint 1 and Sprint 2 releases identifiable. Record the actual final version for final verification, not only a previous sprint's green run. Mark failures/skips and unresolved defects explicitly.

Do not create a new PR merely to record a preceding merge SHA. Final merge identity can be read from the release PR and CI/deployment metadata and cited directly in the course report. Assemble related release documentation in the release change; keep evidence of any post-merge main run in its immutable run/artifact record.

Preserve contract revisions, implementation history and CI runs. Main source commit, image digest and running revision identify different things; a database migration is not reverted simply by rolling back an app image.
