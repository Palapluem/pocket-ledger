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
| Public URL | |
| How the live service exposes or identifies its source commit | |

## Stack and deviations from the starter kit

| Component | Selected technology / version | Responsibility / durable state | Difference from the reference and reason |
| --- | --- | --- | --- |
| UI | React 19 + TanStack Router, built by Vite (`apps/web`) | Sign-in, identity, sign-out, user administration; no durable state in the browser except the HttpOnly session cookie | Reference uses a separate nginx client container; PocketLedger serves the built client from the API process (same origin), so one Cloud Run service, no CORS for the browser and a simple cookie policy |
| API / application | Bun 1.4.4 + Elysia (`apps/server`) | Auth (stateless HS256 JWT cookie, D-05), user administration, `/api/health` | Bun instead of Node 24/Express (D-02) |
| Database | PostgreSQL 18.4 (local/CI), Cloud SQL PostgreSQL 18 (cloud) | Users and all future financial records; persists outside containers | Same engine as the reference |
| Migration / seed | Drizzle migrations (`packages/db/src/migrate.ts`); idempotent seed (`seed.ts`) | Container entrypoint applies pending migrations, then inserts only missing seed users; existing users and data are never changed | Reference uses a separate migration job; the entrypoint approach is simpler for one service. Migrations must stay backward compatible because a starting revision applies them |
| Container / CI | Multi-stage `Dockerfile` (`oven/bun:1.4.4` build, `oven/bun:1.4.4-slim` runtime, non-root `bun` user, port 8080); GitHub Actions `ci.yml` and `deploy.yml` | CI: types, Biome, PostgreSQL integration tests, web build, Docker build | Pinned to the D-02 Bun version |
| GCP services | Cloud Run, Cloud SQL, Artifact Registry, Secret Manager, Workload Identity Federation | See the resource inventory | Follows the reference services |

The browser loads the client from the Cloud Run URL and calls `/api/*` on the same origin. The API connects to Cloud SQL through the Cloud Run Cloud SQL connector (unix socket `/cloudsql/<connection name>`, set in `DATABASE_URL`). Sessions are stateless signed JWTs in an HttpOnly cookie (D-05); there is no server-side session store and no uploaded content.

## Environment and secrets

List every variable the application, seed and relevant delivery steps read. Include build-time client variables where applicable; browser-bundled values cannot contain secrets. Use placeholders in `.env.example` and record secret locations by name, never by value.

| Variable | Purpose | Build / runtime / seed / pipeline | Required / default | Secret? | Source of value / secret reference | Example file |
| --- | --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection | runtime, migrate, seed | required | yes | Secret Manager `pl-database-url` | `.env.example` |
| `JWT_SECRET` | HS256 signing key, at least 32 bytes | runtime | required | yes | Secret Manager `pl-jwt-secret` | `.env.example` |
| `JWT_ISSUER` / `JWT_AUDIENCE` | token claims | runtime | default `pocket-ledger` / `pocket-ledger-web` | no | defaults | `.env.example` |
| `CORS_ORIGIN` | the one allowed browser origin for unsafe requests | runtime | required | no | GitHub variable `PUBLIC_URL` | `.env.example` |
| `COOKIE_SECURE` | add `Secure` to the cookie | runtime | default false; `true` on Cloud Run | no | deploy workflow | `.env.example` |
| `PORT` | listen port | runtime | default 3000; image sets 8080; Cloud Run injects | no | image / platform | `.env.example` |
| `GIT_COMMIT` | commit reported by `/api/health` | build arg → runtime | default `unknown` | no | deploy workflow (`github.sha`) | `.env.example` |
| `WEB_DIST_DIR` | built client directory | runtime | image sets `/app/apps/web/dist` | no | image | `.env.example` |
| `SEED_USERS_JSON` | synthetic users inserted if missing | entrypoint seed | optional | yes (passwords) | Secret Manager `pl-seed-users` | `.env.example` |
| `TEST_DATABASE_URL` | disposable test database | tests | required for tests | yes (local) | local only / CI throwaway | `.env.example` |
| `POSTGRES_PASSWORD` | local compose database password | compose | required for compose | yes (local) | local `.env` | `.env.example` |
| `GCP_*`, `ARTIFACT_REPOSITORY`, `CLOUD_RUN_SERVICE`, `CLOUD_SQL_CONNECTION_NAME`, `PUBLIC_URL` | deploy targets and identities | pipeline | required for deploy | no | GitHub repository variables (printed by `deploy/gcp-setup.sh`) | — |

## Reproduction commands

Record exact commands for the selected stack, required working directory and prerequisites. Do not keep commands that only work for the TokTickIT example.

| Operation | Working directory and exact command | Preconditions | Expected result |
| --- | --- | --- | --- |
| Install locked dependencies | repo root: `bun install --frozen-lockfile` | Bun 1.4.4 | lockfile unchanged |
| Start local persistent database | repo root: `docker compose up -d db` (named volume `pgdata`) | `.env` with `POSTGRES_PASSWORD` | healthy PostgreSQL 18.4 |
| Apply migrations | `DATABASE_URL=… bun run db:migrate` (the image entrypoint also runs it) | database reachable | `Migrations applied` |
| Seed synthetic accounts/data | `DATABASE_URL=… SEED_USERS_JSON='[…]' bun run db:seed` | migrated database | `Seeded N new user(s)`; rerun prints `Seeded 0` |
| Run app locally in production mode | repo root: `docker compose up --build` | `.env` with `POSTGRES_PASSWORD`, `JWT_SECRET`, optional `SEED_USERS_JSON` | `http://localhost:8080` serves the UI; `/api/health` is `ok` |
| Unit / domain tests | | | |
| API / database integration tests | `./scripts/test-db.sh up`, then `TEST_DATABASE_URL=… bun test apps/server` | Docker; disposable DB on loopback 55432 | 40 pass (local, branch head) |
| Client / UI tests | | | |
| Selected E2E / full required suite | | | |
| Production build | `bun run build:web` | installed dependencies | `apps/web/dist` |
| Build Docker image from a clean clone | `git clone … && cd pocket-ledger && docker build --build-arg GIT_COMMIT=$(git rev-parse HEAD) -t pocket-ledger .` | Docker | image built (local run recorded in PR) |
| Run container with external configuration | `docker compose up` (or `docker run -p 8080:8080 -e DATABASE_URL=… -e JWT_SECRET=… -e CORS_ORIGIN=http://localhost:8080 pocket-ledger`) | reachable PostgreSQL | migrations, seed, server on 8080 |

Tests refuse any database except `pocket_ledger_test` on a loopback port (`assertDisposableTestDatabase`). The seed inserts with `ON CONFLICT (email) DO NOTHING`, so rerunning it on every container start never changes an existing user, password, role, enabled state or (future) financial record.

## GCP resource inventory

| Resource | Actual non-secret name / ID | Region | Purpose | Access / secret references |
| --- | --- | --- | --- | --- |
| GCP project | | asia-southeast1 | all resources | owner: Natthawat |
| Application service | Cloud Run `pocket-ledger` | asia-southeast1 | UI + API | runtime SA `pl-runtime` |
| Persistent database | Cloud SQL `pocket-ledger-db` (PostgreSQL 18, db-f1-micro), database `pocket_ledger` | asia-southeast1 | durable data | user `pocket_ledger`; password only in `pl-database-url` |
| Image registry | Artifact Registry `pocket-ledger` (docker) | asia-southeast1 | images tagged with full SHA, deployed by digest | `pl-deployer` writes |
| Migration mechanism / job | container entrypoint (`scripts/docker-entrypoint.sh`) | — | migrate + idempotent seed at start | — |
| Runtime identity | `pl-runtime@<project>.iam.gserviceaccount.com` | — | Cloud SQL client, Secret accessor | — |
| Deployment identity / WIF provider if used | `pl-deployer@…`; pool `github`, provider `pocket-ledger` limited to `Palapluem/pocket-ledger` on `refs/heads/main` | global | GitHub Actions deploy without keys | Run admin, Artifact Registry writer |
| Secret Manager references if used | `pl-database-url`, `pl-jwt-secret`, `pl-seed-users` | — | runtime secrets | `pl-runtime` reads |

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

## Rollback / recovery, if exercised

Document the prior image/version, compatibility prerequisites, exact pipeline procedure and observed recovery. Separate an app-image rollback from a database restore. Rollback/roll-forward is recommended rather than a separate scored requirement.

## Known limitations and ownership

| Limitation / pending check | Impact | Owner | Status / evidence |
| --- | --- | --- | --- |
| | | | |
