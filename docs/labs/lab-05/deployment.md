# Deployment and release procedure

> Working record for Lab 5 (Issue #17). Configuration and local results below are actual; cloud cells stay blank until the deployment runs. Store real secret values outside this document and Git.

## Product and accepted baseline

| Field | Actual value |
| --- | --- |
| Team / section | |
| Product and repository | PocketLedger · https://github.com/Palapluem/pocket-ledger |
| Accepted Sprint 1 tag / full commit | |
| Current assessed release tag / full commit | |
| Sprint staging branch | `sprint-1-staging` |
| How the live service exposes or identifies its source commit (implemented) | `GET /api/health` returns `commit` (the full SHA passed as the `GIT_COMMIT` build arg); the page footer shows it |
| Public URL | `https://pocket-ledger-468473091761.asia-southeast3.run.app` (expected Cloud Run URL, set as `PUBLIC_URL`; confirm after the first deployment) |

## Stack and deviations from the starter kit

| Component | Selected technology / version | Responsibility / durable state | Difference from the reference and reason |
| --- | --- | --- | --- |
| UI | React 19 + TanStack Router, built by Vite (`apps/web`) | Sign-in, identity, sign-out, user administration; no durable state in the browser except the HttpOnly session cookie | Reference uses a separate nginx client container; PocketLedger serves the built client from the API process (same origin), so one Cloud Run service, no CORS for the browser and a simple cookie policy |
| API / application | Bun 1.4.4 + Elysia (`apps/server`) | Auth (stateless HS256 JWT cookie, D-05), user administration, `/api/health` | Bun instead of Node 24/Express (D-02) |
| Database | PostgreSQL 18.4 (local/CI), Cloud SQL PostgreSQL 18 (cloud) | Users and all future financial records; persists outside containers | Same engine as the reference |
| Migration / seed | Drizzle migrations (`packages/db/src/migrate.ts`); idempotent seed (`seed.ts`) | Production: the deploy workflow runs the Cloud Run job `pocket-ledger-migrate` (image entrypoint in `migrate` mode, migrator role) once per release before the service update; it applies pending migrations, then inserts only missing seed users and each User's missing starter financial accounts. The Cloud Run service starts in `serve` mode without migrating. Local Compose only: `serve` with `RUN_MIGRATIONS=true` migrates and seeds before starting. Existing users and data are never changed | Same separate-migration-job approach as the reference. Migrations must stay backward compatible because the old revision keeps serving between the job and the service update |
| Container / CI | Multi-stage `Dockerfile` (`oven/bun:1.4.4` build, `oven/bun:1.4.4-slim` runtime, non-root `bun` user, port 8080); GitHub Actions `ci.yml` and `deploy.yml` | CI: types, Biome, PostgreSQL integration tests, web build, Playwright E2E, Docker build | Pinned to the D-02 Bun version |
| GCP services | Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, Workload Identity Federation | See the resource inventory | Follows the reference services |

The browser loads the client from the Cloud Run URL and calls `/api/*` on the same origin. The API connects to Cloud SQL through the Cloud Run Cloud SQL connector (unix socket `/cloudsql/<connection name>`, set in `DATABASE_URL`). Sessions are stateless signed JWTs in an HttpOnly cookie (D-05); there is no server-side session store and no uploaded content.

## Environment and secrets

List every variable the application, seed and relevant delivery steps read. Include build-time client variables where applicable; browser-bundled values cannot contain secrets. Use placeholders in `.env.example` and record secret locations by name, never by value.

| Variable | Purpose | Build / runtime / seed / pipeline | Required / default | Secret? | Source of value / secret reference | Example file |
| --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection. Cloud Run service: limited app role; migration job: migrator role | runtime, migrate, seed | required | yes | Secret Manager `pl-database-url` (service, `pocket_ledger_app`) and `pl-migration-database-url` (job, `pocket_ledger_migrator`) | `.env.example` |
| `JWT_SECRET` | HS256 signing key, at least 32 bytes | runtime | required | yes | Secret Manager `pl-jwt-secret` | `.env.example` |
| `JWT_ISSUER` / `JWT_AUDIENCE` | token claims | runtime | default `pocket-ledger` / `pocket-ledger-web` | no | defaults | `.env.example` |
| `JWT_TTL_SECONDS` | guard only: the lifetime is fixed at 3600 by D-05; any other value stops startup | runtime | leave unset (or `3600`) | no | not set | `.env.example` (comment) |
| `RUN_MIGRATIONS` | `serve` mode runs the `migrate` step (migrations, then seed if `SEED_USERS_JSON` is set) before starting; only local Compose sets it; Cloud Run uses the migration job instead | runtime | default `false`; compose `true` | no | `docker-compose.yml` | `.env.example` |
| `CORS_ORIGIN` | the one allowed browser origin for unsafe requests | runtime | required | no | GitHub variable `PUBLIC_URL` | `.env.example` |
| `COOKIE_SECURE` | add `Secure` to the cookie | runtime | default false; `true` on Cloud Run | no | deploy workflow | `.env.example` |
| `PORT` | listen port | runtime | default 3000; image sets 8080; Cloud Run injects | no | image / platform | `.env.example` |
| `GIT_COMMIT` | commit reported by `/api/health` | build arg → runtime | default `unknown` | no | deploy workflow (`github.sha`) | `.env.example` |
| `WEB_DIST_DIR` | built client directory | runtime | image sets `/app/apps/web/dist` | no | image | `.env.example` |
| `SEED_USERS_JSON` | synthetic users inserted if missing | `migrate` mode / seed | optional | yes (passwords) | Secret Manager `pl-seed-users` (migration job only) | `.env.example` |
| `TEST_DATABASE_URL` | disposable test database | tests | required for tests | yes (local) | local only / CI throwaway | `.env.example` |
| `POSTGRES_PASSWORD` | local compose database password | compose | required for compose | yes (local) | local `.env` | `.env.example` |
| `GCP_PROJECT_ID`, `GCP_REGION`, `ARTIFACT_REPOSITORY`, `CLOUD_RUN_SERVICE`, `CLOUD_SQL_CONNECTION_NAME`, `GCP_RUNTIME_SERVICE_ACCOUNT`, `GCP_MIGRATOR_SERVICE_ACCOUNT`, `GCP_DEPLOY_SERVICE_ACCOUNT`, `GCP_WIF_PROVIDER`, `PUBLIC_URL` | deploy targets and identities | pipeline | required for deploy | no | GitHub repository variables (values from the GCP setup runbook below) | — |

## Reproduction commands

Record exact commands for the selected stack, required working directory and prerequisites. Do not keep commands that only work for the TokTickIT example.

| Operation | Working directory and exact command | Preconditions | Expected result |
| --- | --- | --- | --- |
| Install locked dependencies | repo root: `bun install --frozen-lockfile` | Bun 1.4.4 | lockfile unchanged |
| Start local persistent database | repo root: `docker compose up -d db` (named volume `pgdata`) | `.env` with `POSTGRES_PASSWORD` | healthy PostgreSQL 18.4 |
| Apply migrations | `DATABASE_URL=… bun run db:migrate`. The image migrates only in `migrate` mode (the Cloud Run job) or in `serve` mode with `RUN_MIGRATIONS=true` (local Compose); a plain `serve` start does not migrate | database reachable | `Migrations applied` |
| Seed synthetic accounts/data | `DATABASE_URL=… SEED_USERS_JSON='[…]' bun run db:seed` | migrated database | `Seeded N new user(s)` and `Seeded N new financial account(s)`; a rerun prints 0 for both |
| Run app locally in production mode | repo root: `docker compose up --build` | `.env` with `POSTGRES_PASSWORD`, `JWT_SECRET`, optional `SEED_USERS_JSON` | `http://localhost:8080` serves the UI; `/api/health` is `ok` |
| Unit / domain tests | none yet: Sprint 1 has no separate unit suite; rules are covered by the API/database integration tests | — | — |
| API / database integration tests | `./scripts/test-db.sh up`, then `TEST_DATABASE_URL=… bun test apps/server` | Docker; disposable DB on loopback 55432 | 43 pass, 0 fail (CI run #35, id 43706968919, head `8f85a42`) |
| Client / UI tests | none yet: no component-level suite; the client is covered by the browser E2E below | — | — |
| Selected E2E / full required suite | `bun run build:web && TEST_DATABASE_URL=… bun run test:e2e` (`e2e/sprint-1/identity.spec.ts`, TEST-04) | disposable test DB up; `bunx playwright install chromium` | 4 pass, 0 fail (CI run #35, id 43706968919, head `8f85a42`) |
| Production build | `bun run build:web` | installed dependencies | `apps/web/dist` |
| Build Docker image from a clean clone | `git clone … && cd pocket-ledger && docker build --build-arg GIT_COMMIT=$(git rev-parse HEAD) -t pocket-ledger .` | Docker | image built (local run recorded in PR) |
| Run container with external configuration | Compose: `docker compose up` (sets `RUN_MIGRATIONS=true`) | `.env` as above | migrations, seed if `SEED_USERS_JSON` is set, server on 8080 |
| Migrate an external database with the image | `docker run --rm -e DATABASE_URL=… [-e SEED_USERS_JSON='[…]'] pocket-ledger migrate` | reachable PostgreSQL; migrator credential | `Migrations applied`; seed only if `SEED_USERS_JSON` is set |
| Serve against a pre-migrated database | `docker run -p 8080:8080 -e DATABASE_URL=… -e JWT_SECRET=… -e CORS_ORIGIN=http://localhost:8080 pocket-ledger` (default `serve`, no migration) | database already migrated | server on 8080; `/api/health` is `ok` |

Tests refuse any database except `pocket_ledger_test` on a loopback port (`assertDisposableTestDatabase`). The seed inserts users with `ON CONFLICT (email) DO NOTHING` and starter accounts with `ON CONFLICT (owner_id, account_key) DO NOTHING`, so rerunning it (each migration job run or Compose start) never changes an existing user, password, role, enabled state or (future) financial record.

## GCP resource inventory

| Resource | Actual non-secret name / ID | Region | Purpose | Access / secret references |
| --- | --- | --- | --- | --- |
| GCP project | `exalted-stage-316316` (number 468473091761) | asia-southeast3 (Bangkok) | all resources | owner: Natthawat |
| Application service | Cloud Run `pocket-ledger` | asia-southeast3 | UI + API | runtime SA `pl-runtime` |
| Persistent database | Cloud SQL `pocket-ledger-db` (PostgreSQL 18, db-f1-micro; connection `exalted-stage-316316:asia-southeast3:pocket-ledger-db`), database `pocket_ledger` | asia-southeast3 | durable data | login roles `pocket_ledger_app` (service, in `pl-database-url`) and `pocket_ledger_migrator` (job, in `pl-migration-database-url`); `pocket_ledger` is only the database name |
| Image registry | Artifact Registry `pocket-ledger` (docker) | asia-southeast3 | images tagged with full SHA, deployed by digest | `pl-deployer` writes |
| Migration mechanism / job | Cloud Run job `pocket-ledger-migrate` (same image, `migrate` mode), run by the deploy workflow before the service update; migrations also hold a PostgreSQL advisory lock | asia-southeast3 | migrate + idempotent seed once per release | `pl-migrator` SA; `pl-migration-database-url`, `pl-seed-users` |
| Runtime identity | `pl-runtime@exalted-stage-316316.iam.gserviceaccount.com` | — | Cloud SQL Client (project); Secret Accessor on `pl-database-url` and `pl-jwt-secret` only | DB role `pocket_ledger_app` (DML only) |
| Migration identity | `pl-migrator@exalted-stage-316316.iam.gserviceaccount.com` | — | Cloud SQL Client (project); Secret Accessor on `pl-migration-database-url` and `pl-seed-users` only | DB role `pocket_ledger_migrator` (owns the schema; no CREATEDB/CREATEROLE) |
| Deployment identity / WIF provider if used | `pl-deployer@exalted-stage-316316.iam.gserviceaccount.com`; provider `projects/468473091761/locations/global/workloadIdentityPools/github/providers/pocket-ledger` (pool `github`, provider `pocket-ledger`) limited to `Palapluem/pocket-ledger` on `refs/heads/main` | global | GitHub Actions deploy without keys | Cloud Run Admin, Artifact Registry Writer, Service Account User on `pl-runtime` and `pl-migrator` only |
| Secret Manager references if used | `pl-database-url`, `pl-jwt-secret` (service); `pl-migration-database-url`, `pl-seed-users` (job) | — | runtime secrets | per-secret IAM bindings only |

Document chosen cost controls, budget alerts, service availability during grading and when pause/teardown is permitted. Do not include billing credentials or secret values.

## CI and required gate

| Item | Actual configuration and evidence |
| --- | --- |
| CI workflow and pull-request base branches | `.github/workflows/ci.yml` on PRs and pushes to `main` and `sprint-1-staging` |
| Required check name, selected from an actual run | `build-test` |
| Ruleset / branch protection for the normal integration and release path | **Pending verification.** The CI workflow defines the `build-test` check, but the available GitHub connection cannot read branch-protection settings; no ruleset was returned. Do not claim a required merge gate until the setting is verified. |
| Teammate approval requirement and bypass policy | PR #28 has a specific teammate release review; the GitHub production environment required N0TAW00D's deployment approval. The branch-protection approval and bypass settings remain unverified. |
| Passing PR and run (C-01) | **PASS:** PR #28 to `main`, head `922adfc`, CI run [#64](https://github.com/Palapluem/pocket-ledger/actions/runs/43905359658) succeeded. Staging run [#63](https://github.com/Palapluem/pocket-ledger/actions/runs/43904845851) reports 125 PostgreSQL server tests across 14 files and 11 Playwright browser E2E tests, plus type check, Biome, web build and production Docker image build; the release PR run completed the same CI job successfully. |
| Temporary failing PR, failed required check and blocked merge (C-02) | **PENDING:** no temporary failing-check PR or blocked-merge evidence is recorded. Do not merge a proof PR; first verify that `build-test` is required on the intended branches. |

If a failing proof PR is created after the required gate is verified, keep it unmerged and preserve its version/run evidence. Identify how the relevant automated suites are included rather than assuming the starter commands cover the app.

## Repeatable release procedure

Either teammate repeats these steps. The deploy steps are defined in `.github/workflows/deploy.yml`; nobody deploys from a laptop.

1. **Integrate on staging.** Each change is merged into `sprint-1-staging` through its own reviewed PR with a passing `build-test` check.
2. **Open and merge the release PR.** Open one PR from `sprint-1-staging` into `main`. Wait for `build-test` to pass and for the other teammate's approval; that teammate merges it.
3. **Identify the release SHA.** The release SHA is the full merge commit on `main` (`git rev-parse origin/main` after `git fetch`, or the merge commit shown on the PR). The push to `main` starts two runs for this SHA: CI on `main` and Deploy.
4. **Approve the deployment.** Open the Deploy run under Actions. If it shows "production requires an approval", N0TAW00D (the environment's required reviewer) clicks **Review deployments**, ticks `production` and chooses **Approve and deploy**. To redeploy an existing `main` commit, run the Deploy workflow manually (`workflow_dispatch`) on `main`.
5. **Follow the run to success.** The single `deploy` job runs these steps in order, and any failure stops the release:
   1. It authenticates to GCP through Workload Identity Federation as `pl-deployer`. No key file is used.
   2. It builds the image with `GIT_COMMIT=<release SHA>`, pushes it tagged with the full SHA, and reads its digest. The step summary records `Image: …@sha256:…`.
   3. It runs the Cloud Run job `pocket-ledger-migrate` from that digest with `--args migrate`, as `pl-migrator`, with `pl-migration-database-url` and `pl-seed-users`. Migrations apply, and synthetic users and starter accounts are seeded only where they are missing. The job must finish successfully (`--wait`, no retries).
   4. It deploys the same digest to the Cloud Run service as `pl-runtime`, with `pl-database-url` and `pl-jwt-secret`. The step summary records `Revision: …`.
   5. It runs read-only smoke checks. `/api/health` must report `"commit":"<release SHA>"` and `"database":"ok"`, and `/login` must serve the PocketLedger page.
6. **Verify and record.** From the run's step summary and logs, copy the CI and Deploy run links, the release SHA, the image digest, the revision and the smoke results into the release table below. Optionally confirm in the Cloud Console that the service's serving revision runs that digest. Then run the live checks below against the public URL with `scripts/live-check.ts` (`record` once to create the baseline, `verify` after each restart or redeploy). It signs in as a synthetic seeded User whose password is entered at a hidden prompt and never written to output.

| Release | Main commit | Reviewed PRs | CI / deploy run | Image tag and digest | Running revision / traffic | Smoke result |
| --- | --- | --- | --- | --- | --- | --- |
| [2026-11-16](https://github.com/Palapluem/pocket-ledger/pull/28) | `bbf7c4a168b6b3585c4e973bb78faf7f233fd11b` | PR #25 (reviewed change to staging); PR #28 (staging → main, approved by N0TAW00D) | CI #64 (release PR), #63 (staging); main CI [#66](https://github.com/Palapluem/pocket-ledger/actions/runs/43911059795); deploy [#1](https://github.com/Palapluem/pocket-ledger/actions/runs/43911059895) | Full-SHA tag `bbf7c4a168b6b3585c4e973bb78faf7f233fd11b`; digest `sha256:83a5c319aa4259b8a75521fce5af17a07c2dba195ee0d54f1aae41ca355851a6` | Cloud Run revision `pocket-ledger-00001-dnf` | Deploy run #1 passed read-only smoke checks: `/api/health` reported the release commit and database health; `/login` served the client. |

The source → image → revision chain is identified by the full-SHA image tag, the deployed digest (not a mutable tag), and the commit that `/api/health` reports from the running service.

## Live checks and persistence

| Check | Data / scenario and version | Action | Expected / actual result | Evidence |
| --- | --- | --- | --- | --- |
| C-03 clean clone | Release `bbf7c4a`; environment copied from `.env.example` with local-only test values | A fresh local clone was checked out at the release SHA on 17 Nov. Docker Compose could not start because the Docker daemon was unavailable; a fresh GitHub clone was blocked by DNS/network access. | **NOT RUN:** no working-container or health result from the clean clone. PR #19 includes author-reported local build/Compose results, but this audit could not reproduce the clean-clone check. | Audit note (17 Nov); PR #19 author-reported local verification |
| C-04 public domain workflow and rejection/access restriction | Public URL; `/api/health` commit `bbf7c4a168b6b3585c4e973bb78faf7f233fd11b`, revision `pocket-ledger-00001-dnf`; synthetic seeded User; 18 Nov 2026 12:51 UTC | `bun scripts/live-check.ts record <dir> c04` (headless Chromium). The script signs in through the browser and records a 1,200.00 card charge split Dining 700.00 / Groceries 500.00, with a unique memo. It reads the charge back with `GET /api/transactions/:id`, then submits 700.00 + 400.00 against 1,200.00. Finally it calls `GET /api/summary` with no session. | **PASS (12/12 assertions).** Save 201, transaction `62b441fb-4edc-4574-97eb-835ad111ca2f`, retrieved with the same lines. Against the before summary, independently expected deltas: Expense +1,200.00, Credit card +1,200.00, Dining +700.00, Groceries +500.00; Bank and Income unchanged. The mismatch was rejected with 422 `ALLOCATION_MISMATCH`, the summary was unchanged, and the alert was shown. The unauthenticated read returned 401 `UNAUTHENTICATED`. | [c04-log.txt](evidence/c04-log.txt); screenshots [signed in](evidence/c04-02-overview-signed-in.png), [charge form](evidence/c04-03-charge-form.png), [saved and shown](evidence/c04-04-overview-after-save.png), [rule rejection](evidence/c04-05-rule-rejection.png) |
| C-05 before restart | Same run as C-04, revision `pocket-ledger-00001-dnf` | The C-04 run stores the saved transaction and the full summary as the baseline. | Baseline: transaction `62b441fb-4edc-4574-97eb-835ad111ca2f` (PAYMENT, 2026-11-18, total 1,200.00; Dining 700.00, Groceries 500.00); Credit card 1,200.00, Dining 700.00, Groceries 500.00, Bank 0.00, Income 0.00, Expense 1,200.00. | [c05-record.json](evidence/c05-record.json); [c04-log.txt](evidence/c04-log.txt) |
| C-05 after actual application restart | Same record and Cloud SQL database; same image digest and commit `bbf7c4a` | In Cloud Shell, after the C-04 run: `gcloud run services update pocket-ledger --region asia-southeast3 --update-env-vars LAB5_RESTART=<epoch>`. This changes configuration only, so Cloud Run replaced every container with a new revision of the same image. `latestReadyRevisionName` changed from `pocket-ledger-00001-dnf` to `pocket-ledger-00002-r2w`, which serves 100% of traffic. Then at 12:56 UTC: `bun scripts/live-check.ts verify <dir> after-restart`. | **PASS (4/4).** Health reported the same commit with `database: ok`. `GET /api/transactions/62b441fb-…` returned 200 with an identical record, and the summary is identical to the baseline. The overview shows the same record. | [after-restart-log.txt](evidence/after-restart-log.txt); [overview after restart](evidence/after-restart-03-overview-same-record.png) |
| C-05 after redeploy | Same record and database | No redeploy followed by a fresh read of the same record was verified. | **NOT RUN on GCP.** | Cloud Run before/after evidence pending |
| C-06 source/image/revision match | Release PR #28; main `bbf7c4a168b6b3585c4e973bb78faf7f233fd11b` | Deploy workflow built the full-SHA image, deployed its digest, ran migrations/seed, and smoke-tested the running commit and database. | **PASS:** deploy run #1 succeeded; the recorded revision is `pocket-ledger-00001-dnf` and the workflow confirmed the served commit matches the release SHA. | PR #28; main CI #66; [deploy run #1](https://github.com/Palapluem/pocket-ledger/actions/runs/43911059895) |

Record the same synthetic transaction identifier and financial values before/after the two events. State the actual restart mechanism and versions; a redeploy-only check does not establish both checks.

## GCP setup runbook (manual, one time)

Run by the project owner in the Cloud Console and Cloud Shell, region `asia-southeast3`. Every step is a first-time creation; if a resource already exists, stop and inspect it instead of recreating or overwriting it (see Credential rotation). Never paste secret values into chat, Issues, logs or the report.

1. Enable APIs: Cloud Run Admin, Cloud SQL Admin, Artifact Registry, Secret Manager, IAM, IAM Service Account Credentials, Security Token Service.
2. Artifact Registry: create Docker repository `pocket-ledger` in `asia-southeast3`.
3. Cloud SQL: create PostgreSQL 18 instance `pocket-ledger-db` (Enterprise, shared core `db-f1-micro`, 10 GB) with a strong `postgres` password kept outside Git. Create database `pocket_ledger`. The Cloud Console cannot assign custom PostgreSQL database roles to a built-in user. A built-in user created without custom database roles receives `cloudsqlsuperuser` by default; `gcloud sql users create` supports `--database-roles` when custom roles already exist. In this deployment, console-created application users had the default elevated role and were recreated with the restricted SQL roles in step 4. Use the SQL procedure below for this setup. Verify with `SELECT rolname, pg_has_role(rolname, 'cloudsqlsuperuser', 'member') FROM pg_roles WHERE rolname LIKE 'pocket%';`; it must return `f` for both application roles. See [Cloud SQL user management](https://docs.cloud.google.com/sql/docs/postgres/create-manage-users). Copy the connection name.
4. Database roles: in Cloud Shell, connect with `gcloud sql connect pocket-ledger-db --user=postgres --database=pocket_ledger`. In the interactive `psql` session, run the following. Create two distinct strong passwords in a password manager; enter them only at the hidden `\password` prompts below. Do not put password values in SQL text, command arguments, shell history, CI logs, or Git.

   ```psql
   CREATE ROLE pocket_ledger_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
   CREATE ROLE pocket_ledger_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
   \password pocket_ledger_migrator
   \password pocket_ledger_app
   GRANT pocket_ledger_migrator TO CURRENT_USER;
   REVOKE ALL ON DATABASE pocket_ledger FROM PUBLIC;
   GRANT CONNECT, CREATE ON DATABASE pocket_ledger TO pocket_ledger_migrator;
   GRANT CONNECT ON DATABASE pocket_ledger TO pocket_ledger_app;
   GRANT USAGE, CREATE ON SCHEMA public TO pocket_ledger_migrator;
   GRANT USAGE ON SCHEMA public TO pocket_ledger_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE pocket_ledger_migrator IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pocket_ledger_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE pocket_ledger_migrator IN SCHEMA public
     GRANT USAGE, SELECT ON SEQUENCES TO pocket_ledger_app;
   ```

   On Cloud SQL, `postgres` is not a true superuser and cannot take ownership of `public` (owned by `pg_database_owner`), so the migrator gets `USAGE, CREATE` on it instead; it owns every table it creates. The `psql \password` commands prompt without echoing the password and avoid placing cleartext passwords in SQL history or command arguments. Cloud SQL instance password policies are optional; the policy setting for this instance was not verified. If enabled, follow its configured constraints. Use strong, distinct passwords regardless, and URL-encode any reserved characters when placing a password in a database URL. See [Cloud SQL instance password policy](https://docs.cloud.google.com/sql/docs/postgres/create-instance) and the [psql password command](https://www.postgresql.org/docs/current/app-psql.html).

   Verified on 16 November with this exact SQL. Locally on `postgres:18.4`: the migrator applied all migrations and seeded users and starter accounts; the app role could select, insert, update and delete, but was refused `CREATE TABLE`, `DROP TABLE users`, `ALTER TABLE`, `CREATE DATABASE` and `CREATE SCHEMA`. On the Cloud SQL instance: both roles report `rolcreatedb`, `rolcreaterole` and `cloudsqlsuperuser` membership as `f`.
5. Secret Manager (create each once): `pl-database-url` = `postgresql://pocket_ledger_app:<app password>@localhost/pocket_ledger?host=/cloudsql/<connection name>`; `pl-migration-database-url` = the same with `pocket_ledger_migrator:<migrator password>`; `pl-jwt-secret` = `openssl rand -hex 32`; `pl-seed-users` = JSON array of synthetic `{email, displayName, role, password}` including one administrator. URL-encode special characters in passwords. Build `pl-seed-users` with a JSON serializer (for example `python3 -c 'import json; print(json.dumps([...]))'`) rather than by hand, and check it with `json.load` before deploying: an invalid value makes the migration job fail at seed.
6. Service accounts: `pl-runtime`, `pl-migrator`, `pl-deployer`. Project roles: `pl-runtime` and `pl-migrator` get Cloud SQL Client; `pl-deployer` gets Cloud Run Admin and Artifact Registry Writer. Secret access per secret only, never as a project-level Secret Manager Secret Accessor grant, because that would let the runtime read the migrator URL and seed passwords (each secret's Permissions tab, role Secret Manager Secret Accessor): `pl-runtime` on `pl-database-url` and `pl-jwt-secret`; `pl-migrator` on `pl-migration-database-url` and `pl-seed-users`. On `pl-runtime` and `pl-migrator` (Principals with access), grant `pl-deployer` the Service Account User role.
7. Workload Identity Federation (Cloud Shell):

   ```bash
   PROJECT_ID=<project id>; PN=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
   gcloud iam workload-identity-pools create github --location=global --project=$PROJECT_ID
   gcloud iam workload-identity-pools providers create-oidc pocket-ledger --location=global \
     --workload-identity-pool=github --project=$PROJECT_ID \
     --issuer-uri=https://token.actions.githubusercontent.com \
     --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
     --attribute-condition="assertion.repository=='Palapluem/pocket-ledger' && assertion.ref=='refs/heads/main'"
   gcloud iam service-accounts add-iam-policy-binding pl-deployer@$PROJECT_ID.iam.gserviceaccount.com \
     --project=$PROJECT_ID --role=roles/iam.workloadIdentityUser \
     --member="principalSet://iam.googleapis.com/projects/$PN/locations/global/workloadIdentityPools/github/attribute.repository/Palapluem/pocket-ledger"
   ```

   If either create command reports that the pool or provider already exists, do not continue: run `gcloud iam workload-identity-pools providers describe pocket-ledger --location=global --workload-identity-pool=github` and confirm the issuer, the mapping and the exact `refs/heads/main` condition before adding the binding.
8. Budget alert (recommended): Billing → Budgets & alerts, for example 10 USD with alerts at 50/90/100%. An alert does not cap spending.
9. GitHub (repository admin): Actions variables `GCP_PROJECT_ID=exalted-stage-316316`, `GCP_REGION=asia-southeast3`, `ARTIFACT_REPOSITORY=pocket-ledger`, `CLOUD_RUN_SERVICE=pocket-ledger`, `CLOUD_SQL_CONNECTION_NAME=exalted-stage-316316:asia-southeast3:pocket-ledger-db`, `GCP_RUNTIME_SERVICE_ACCOUNT=pl-runtime@exalted-stage-316316.iam.gserviceaccount.com`, `GCP_MIGRATOR_SERVICE_ACCOUNT=pl-migrator@exalted-stage-316316.iam.gserviceaccount.com`, `GCP_DEPLOY_SERVICE_ACCOUNT=pl-deployer@exalted-stage-316316.iam.gserviceaccount.com`, `GCP_WIF_PROVIDER=projects/468473091761/locations/global/workloadIdentityPools/github/providers/pocket-ledger`, `PUBLIC_URL=https://pocket-ledger-468473091761.asia-southeast3.run.app`; environment `production` (optional required reviewer); ruleset on `main` and `sprint-1-staging` requiring `build-test` and one approving review.

The deploy workflow creates the Cloud Run job and service on the first `main` release.

## Credential rotation

The runbook is first-time only; never recreate an existing user or secret to "reset" it. To rotate deliberately:

1. Database password (app or migrator role): in one maintenance window, `ALTER ROLE … PASSWORD …` through `gcloud sql connect`, immediately add a matching version of `pl-database-url` or `pl-migration-database-url`, then redeploy so a new revision (or the next job run) reads `latest`. Connections from the old revision fail between the password change and the new revision; check `/api/health` reports `database: ok` afterwards.
2. JWT key: add a new `pl-jwt-secret` version and redeploy. Every outstanding token becomes invalid and users sign in again (accepted in D-05).

Record who rotated, when, and the resulting revision.

## Rollback / recovery, if exercised

Document the prior image/version, compatibility prerequisites, exact pipeline procedure and observed recovery. Separate an app-image rollback from a database restore. Rollback/roll-forward is recommended rather than a separate scored requirement.

## Known limitations and ownership

| Limitation / pending check | Impact | Owner | Status / evidence |
| --- | --- | --- | --- |
| | | | |
