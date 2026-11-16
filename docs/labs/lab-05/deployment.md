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
| Ruleset / branch protection for the normal integration and release path | |
| Teammate approval requirement and bypass policy | |
| Passing PR and run (C-01) | |
| Temporary failing PR, failed required check and blocked merge (C-02) | |

The failing proof PR is not merged. Preserve its version/run evidence. Identify how the relevant automated suites are included rather than assuming the starter commands cover the app.

## Repeatable release procedure

1. Identify the labelled Issue, contract and bounded feature/fix branch from sprint staging.
2. Run relevant tests and obtain a specific teammate review before staging integration.
3. Run integration/system checks and review the release PR into `main`.
4. Identify the accepted full commit and the pipeline trigger/manual approval, if any.
5. Describe actual test, image build/push, migration, service update and smoke-test steps.
6. Verify the running revision/image/source chain and the live domain workflow.

| Release | Main commit | Reviewed PRs | CI / deploy run | Image tag and digest | Running revision / traffic | Smoke result |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

Document how either member repeats the procedure. Keep full-SHA tagging/digest deployment if using the reference approach; explain an alternative identification mechanism.

## Live checks and persistence

| Check | Data / scenario and version | Action | Expected / actual result | Evidence |
| --- | --- | --- | --- | --- |
| C-03 clean clone | | | | |
| C-04 public domain workflow and rejection/access restriction | | | | |
| C-05 before restart | | | | |
| C-05 after actual application restart | | | | |
| C-05 after redeploy | | | | |
| C-06 source/image/revision match | | | | |

Record the same synthetic transaction identifier and financial values before/after the two events. State the actual restart mechanism and versions; a redeploy-only check does not establish both checks.

## GCP setup runbook (manual, one time)

Run by the project owner in the Cloud Console and Cloud Shell, region `asia-southeast3`. Every step is a first-time creation; if a resource already exists, stop and inspect it instead of recreating or overwriting it (see Credential rotation). Never paste secret values into chat, Issues, logs or the report.

1. Enable APIs: Cloud Run Admin, Cloud SQL Admin, Artifact Registry, Secret Manager, IAM, IAM Service Account Credentials, Security Token Service.
2. Artifact Registry: create Docker repository `pocket-ledger` in `asia-southeast3`.
3. Cloud SQL: create PostgreSQL 18 instance `pocket-ledger-db` (Enterprise, shared core `db-f1-micro`, 10 GB) with a strong `postgres` password kept outside Git. Create database `pocket_ledger`. Do not create application users through the console (console/gcloud built-in users get `cloudsqlsuperuser`). Copy the connection name.
4. Database roles: in Cloud Shell, `gcloud sql connect pocket-ledger-db --user=postgres --database=pocket_ledger`, then run (substituting two new generated passwords):

   ```sql
   CREATE ROLE pocket_ledger_migrator LOGIN PASSWORD '<migrator password>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
   CREATE ROLE pocket_ledger_app LOGIN PASSWORD '<app password>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
   GRANT pocket_ledger_migrator TO CURRENT_USER;
   REVOKE ALL ON DATABASE pocket_ledger FROM PUBLIC;
   GRANT CONNECT, CREATE ON DATABASE pocket_ledger TO pocket_ledger_migrator;
   GRANT CONNECT ON DATABASE pocket_ledger TO pocket_ledger_app;
   ALTER SCHEMA public OWNER TO pocket_ledger_migrator;
   GRANT USAGE ON SCHEMA public TO pocket_ledger_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE pocket_ledger_migrator IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pocket_ledger_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE pocket_ledger_migrator IN SCHEMA public
     GRANT USAGE, SELECT ON SEQUENCES TO pocket_ledger_app;
   ```

   Verified locally on `postgres:18.4` with the production image: the migrator applied migrations and seeded; the app role served sign-in and user updates but was refused `CREATE TABLE`, `DROP TABLE users` and `CREATE DATABASE`.
5. Secret Manager (create each once): `pl-database-url` = `postgresql://pocket_ledger_app:<app password>@localhost/pocket_ledger?host=/cloudsql/<connection name>`; `pl-migration-database-url` = the same with `pocket_ledger_migrator:<migrator password>`; `pl-jwt-secret` = `openssl rand -hex 32`; `pl-seed-users` = JSON array of synthetic `{email, displayName, role, password}` including one administrator. URL-encode special characters in passwords.
6. Service accounts: `pl-runtime`, `pl-migrator`, `pl-deployer`. Project roles: `pl-runtime` and `pl-migrator` get Cloud SQL Client; `pl-deployer` gets Cloud Run Admin and Artifact Registry Writer. Secret access per secret only (each secret's Permissions tab, role Secret Manager Secret Accessor): `pl-runtime` on `pl-database-url` and `pl-jwt-secret`; `pl-migrator` on `pl-migration-database-url` and `pl-seed-users`. On `pl-runtime` and `pl-migrator` (Principals with access), grant `pl-deployer` the Service Account User role.
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
