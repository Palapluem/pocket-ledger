# Deployment and release procedure

> Draft working record at the required product path. Fill it from the actual PocketLedger app and successful runs. No deployment is complete; blank cells are unverified. Store real secret values outside this document and Git.

## Product and accepted baseline

| Field | Actual value |
| --- | --- |
| Team / section | |
| Product and repository | PocketLedger · https://github.com/Palapluem/pocket-ledger |
| Accepted Sprint 1 tag / full commit | |
| Current assessed release tag / full commit | |
| Sprint staging branch | `sprint-1-staging` |
| Public URL | |
| How the live service exposes or identifies its source commit | |

## Stack and deviations from the starter kit

| Component | Selected technology / version | Responsibility / durable state | Difference from the reference and reason |
| --- | --- | --- | --- |
| UI | | | |
| API / application | | | |
| Database | | | |
| Migration / seed | | | |
| Container / CI | | | |
| GCP services | | | |

State how the UI reaches the API and how the API reaches the persistent database. Identify where sessions and any required uploaded content live. Explain any departure from the recommended stack.

## Environment and secrets

List every variable the application, seed and relevant delivery steps read. Include build-time client variables where applicable; browser-bundled values cannot contain secrets. Use placeholders in `.env.example` and record secret locations by name, never by value.

| Variable | Purpose | Build / runtime / seed / pipeline | Required / default | Secret? | Source of value / secret reference | Example file |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

## Reproduction commands

Record exact commands for the selected stack, required working directory and prerequisites. Do not keep commands that only work for the TokTickIT example.

| Operation | Working directory and exact command | Preconditions | Expected result |
| --- | --- | --- | --- |
| Install locked dependencies | | | |
| Start local persistent database | | | |
| Apply migrations | | | |
| Seed synthetic accounts/data | | | |
| Run app locally in production mode | | | |
| Unit / domain tests | | | |
| API / database integration tests | | | |
| Client / UI tests | | | |
| Selected E2E / full required suite | | | |
| Production build | | | |
| Build Docker image from a clean clone | | | |
| Run container with external configuration | | | |

State any isolated test database and seed safeguards. Explain how rerunning setup avoids overwriting existing financial activity.

## GCP resource inventory

| Resource | Actual non-secret name / ID | Region | Purpose | Access / secret references |
| --- | --- | --- | --- | --- |
| GCP project | | | | |
| Application service | | | | |
| Persistent database | | | | |
| Image registry | | | | |
| Migration mechanism / job | | | | |
| Runtime identity | | | | |
| Deployment identity / WIF provider if used | | | | |
| Secret Manager references if used | | | | |

Document chosen cost controls, budget alerts, service availability during grading and when pause/teardown is permitted. Do not include billing credentials or secret values.

## CI and required gate

| Item | Actual configuration and evidence |
| --- | --- |
| CI workflow and pull-request base branches | |
| Required check name, selected from an actual run | |
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
