# Lab 5 live-check run summaries

These are sanitized results of the `scripts/live-check.ts` runs. The raw run logs stay outside Git (`COORDINATION.md`) because they contain host paths. Each entry records only what the run verified. `<dir>` stands for the operator's local evidence directory. The synthetic user and password are not recorded.

The **runner** is the operator script, run from a repository checkout on the operator's machine. It is separate from the application under test, which the **target** column identifies.

## C-04: production journey (`record`)
- **Target:** public Cloud Run URL. `/api/health` reported commit `bbf7c4a168b6b3585c4e973bb78faf7f233fd11b` and `database: ok`; revision `pocket-ledger-00001-dnf`.
- **Run:** 18 Nov 2026 12:51 UTC, `bun scripts/live-check.ts record <dir> c04`.
- **Runner:** the pre-review working copy of `scripts/live-check.ts`. The committed `87c1741` differs only in taking the login screenshot before the password is typed.
- **Result:** `RESULT: PASS`, with 10 counted checks, all PASS:
  - health database ok;
  - deltas: Expense +1200.00, Income unchanged, Credit card +1200.00, Dining +700.00, Groceries +500.00, Bank unchanged;
  - rule rejection 422 (`ALLOCATION_MISMATCH`);
  - summary unchanged after the rejection;
  - unauthenticated `GET /api/summary` 401 (`UNAUTHENTICATED`).
- **Stopping assertions,** which would have aborted the run on failure (it completed): sign-in reached the overview, the save returned 201, the history showed the charge, and the rejection alert was shown.
- **Transaction:** `62b441fb-4edc-4574-97eb-835ad111ca2f`. The baseline is in [c05-record.json](c05-record.json).

## C-05: production, after an actual restart (`verify`)
- **Target:** the same URL after `gcloud run services update … --update-env-vars LAB5_RESTART="$(date +%s)"`. The revision changed from `pocket-ledger-00001-dnf` to `pocket-ledger-00002-r2w` on the same image; health still reported `bbf7c4a…` and `database: ok`.
- **Run:** 18 Nov 2026 15:15 UTC, `bun scripts/live-check.ts verify <dir> after-restart`.
- **Runner:** script blob `80d07d2` (commit `baf3b7b`, reviewed in PR #30). That version did not yet take an expected-commit argument; this was added later.
- **Result:** `RESULT: PASS (13/13 checks)`:
  - health database ok;
  - sign-in;
  - field-level read-back of `62b441fb…`: status 200, id, PAYMENT, Credit card, total 1200.00, memo, Bangkok date, allocations Dining 700.00 + Groceries 500.00;
  - record identical to the baseline;
  - summary identical to the baseline;
  - record shown in the overview.

## C-03: clean-clone container (`record`, then `verify` twice)
- **Target:** the application built from a fresh clone of `bbf7c4a168b6b3585c4e973bb78faf7f233fd11b` with `docker compose -p pl-c03 build --no-cache`, served at `http://localhost:8080`. Health reported commit `bbf7c4a…` and `database: ok`. Details are in [c03-build-summary.txt](c03-build-summary.txt).
- **Runner:** script blob `896f471` (commit `44400ef`, identical in `sprint-1-staging` at `547dc33`), run from the operator's repository checkout with `LIVE_URL=http://localhost:8080`. `scripts/live-check.ts` is not in the `bbf7c4a` clone and is not part of the image.
- **Runs, 19 Nov 2026 UTC:**
  - 12:20:08, `record <dir> c03`: `RESULT: PASS (22/22 checks)`. Transaction `4d4af5f3-a6f4-467d-86ad-d553df317f81`; baseline in [c03-record.json](c03-record.json).
  - 12:20:14, after `docker compose restart app` (new PID): `verify`, `RESULT: PASS (13/13 checks)`.
  - 12:20:24, after `docker compose down` and `up -d` on the kept volume (new container; the seed rerun added 0 users and 0 accounts): `verify`, `RESULT: PASS (13/13 checks)`.

## C-05: production, after redeploy (`verify`)
- **Target:** the public URL after release PR #32 was deployed by run 44563996620 (new image, push digest `sha256:df61eee9…`). The revision changed from `pocket-ledger-00002-r2w` to `pocket-ledger-00003-5rh`. Health reported commit `265c99596dd55f3ab91f5ea3db7632df05ab5a65` and `database: ok`.
- **Run:** 20 Nov 2026 14:38 UTC, `bun scripts/live-check.ts verify <dir> after-redeploy 265c99596dd55f3ab91f5ea3db7632df05ab5a65`.
- **Runner:** script blob `9739f37`, identical to `scripts/live-check.ts` on `main` at `265c995`.
- **Result:** `RESULT: PASS (14/14 checks)`:
  - health database ok;
  - sign-in;
  - running commit is the expected `265c995…`;
  - field-level read-back of `62b441fb…`: status 200, id, PAYMENT, Credit card, total 1200.00, memo, Bangkok date, allocations Dining 700.00 + Groceries 500.00;
  - record identical to the baseline;
  - summary identical to the baseline;
  - record shown in the overview.
