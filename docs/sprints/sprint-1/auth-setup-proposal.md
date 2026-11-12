# Authentication and setup contract proposal

Draft 0.1, 12 November 2026 · Issue #2 · **Awaiting team decisions and review.** This document prepares the first source setup for review; it does not approve implementation or replace the Sprint 1 contract.

## Scope

Set up the confirmed Better T Stack workspace and the Sprint 1 seeded-user sign-in foundation. Public self-registration, email delivery and password recovery are outside this slice. Administrators cannot read or modify financial records or summaries. No financial workflow or cloud resource is included.

## Decisions to agree before implementation

| Decision | Reviewable proposal or question |
| --- | --- |
| Runtime | Use Bun 1.4.4 locally, in CI and in both container builds; verify image availability and compatibility before accepting the pin. |
| Session expiry | Select the idle and absolute expiry, whether activity renews a session, and the expired-session response. |
| Session storage | Confirm how Better Auth stores and revokes sessions and whether its storage meets D-05's token-hash proposal. Document any difference before approving it. |
| Browser protection | Agree allowed origins, secure cookie behavior, same-site settings and cross-site request protection for local and deployed environments. |
| Public interface | Confirm the existing proposed POST, GET and DELETE `/api/session` interfaces and their response bodies, statuses and error codes, or revise the System SDS before implementation. Define how Better Auth is exposed behind that contract. |
| Disabled users | Confirm that a disabled user cannot sign in and an existing session is rejected on the next protected request; specify any administrator safeguards separately. |
| Ownership and review | Assign the implementer and teammate reviewer, agree the test interfaces and record both students' decisions in D-02, D-05 and D-07. |

## Acceptance criteria for the future setup

1. A clean checkout has documented install, configuration and run steps, with placeholder-only configuration and locally supplied secrets. No secret values are committed or printed as evidence.
2. Local database access binds to loopback and requires a supplied password. Persistent data is outside application containers. Setup and seed do not overwrite existing financial activity.
3. The approved session interface supports seeded-user sign-in, current identity and logout. Public signup is disabled server-side and absent from the entry screen.
4. Docker Compose configuration and both images use the agreed Bun version. Database stop and project teardown commands state their scope. Existing ignore rules for private data, credentials and evidence remain effective.
5. Verification covers clean setup and build, valid and invalid login, logout, disabled-user rejection, prohibited signup, role separation and persistence against an authorized disposable database. Record commands, results and the tested commit; obtain authorization before creating or changing database resources.

## Review and implementation gate

Resolve the decisions above and update the System SDS, Sprint 1 contract and STS with approved public interfaces and independent expected results. Record the teammate's specific review before writing dependent tests or application behavior. Then implement on a bounded branch from current staging and request the other teammate's review. Palapluem's PR #5 comments on signup, session endpoints, Compose secrets, database exposure, Bun image pinning and ignore rules remain review inputs for that implementation.

## Implementation review checklist

The reverted scaffold remains in Git history at `7015eca` for reference; it is not the current product implementation. Its generated configuration needs these changes before reuse:

| Review finding | Required evidence for the source PR |
| --- | --- |
| Generated Better Auth routes differ from the draft `/api/session` contract | Show the approved route and response contract and verify actual requests against it. Do not publish an unreviewed alternative interface. |
| Generated signup is reachable | Demonstrate that a direct signup request is rejected by the server and that sign-in is the entry point. |
| Compose build secrets point to absent local files | Document how to create every required local configuration file from placeholders, and show that a clean checkout can resolve the Compose configuration without real credentials in Git. |
| PostgreSQL used a default password and exposed all host interfaces | Require a locally supplied password, bind the host port to loopback, and inspect resolved configuration without printing credentials. |
| Database teardown command had an invalid service argument | Document whether the command stops only PostgreSQL or tears down the Compose project; verify that the command matches that scope and preserves the named volume. |
| Bun image tags floated independently of the package manager | Pin the agreed version consistently and record the actual version used for the checks. |
| Generated ignore rules replaced existing protections | Preserve and inspect the existing credential, private-data and evidence ignore patterns as well as generated build ignores. |

The specific test paths and expected HTTP responses remain proposals until D-05 and D-07 are agreed. Do not treat this checklist or a successful build as proof of the identity and privacy acceptance criteria.
