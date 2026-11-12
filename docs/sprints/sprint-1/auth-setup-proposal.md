# Authentication and setup contract proposal

Draft 0.2, 12 November 2026 · Issue #2 · **Awaiting team decisions and review.** This document prepares the first source setup for review; it does not approve implementation or replace the Sprint 1 contract.

## Scope

Set up the confirmed Better T Stack workspace and the Sprint 1 seeded-user sign-in foundation. Public self-registration, email delivery and password recovery are outside this slice. Administrators cannot read or modify financial records or summaries. No financial workflow or cloud resource is included.

## Decisions to agree before implementation

| Decision | Reviewable proposal or question |
| --- | --- |
| Runtime | Use Bun 1.4.4 locally, in CI and in both container builds; verify compatibility before accepting the pin. |
| Session expiry | Select the idle and absolute expiry, whether activity renews a session, and the expired-session response. |
| Session storage | Confirm how Better Auth stores and revokes sessions and whether its storage meets D-05's token-hash proposal. Document any difference before approving it. |
| Browser protection | Agree allowed origins, secure cookie behavior, same-site settings and cross-site request protection for local and deployed environments. |
| Public interface | Confirm the existing proposed POST, GET and DELETE `/api/session` interfaces and their response bodies, statuses and error codes, or revise the System SDS before implementation. Define how Better Auth is exposed behind that contract. |
| Disabled users | Confirm that a disabled user cannot sign in and an existing session is rejected on the next protected request; specify any administrator safeguards separately. |
| Ownership and review | Assign the implementer and teammate reviewer, agree the test interfaces and record both students' decisions in D-02, D-05 and D-07. |

The current Better Auth documentation describes the session table's `token` as the token also used in the session cookie ([session management](https://better-auth.com/docs/concepts/session-management)). This appears to conflict with D-05's proposed hash-only session storage. The team must resolve that difference and verify the selected library version's behavior before approving the contract; do not assume the default adapter hashes session tokens. Better Auth documents an email/password `disableSignUp` option ([options reference](https://better-auth.com/docs/reference/options)); the implementation must still verify direct signup rejection.

Read-only inspection of the locally cached generator dependency `better-auth@1.7.12` provides a concrete reason for this gate: `dist/db/internal-adapter.mjs` generates a session `token`, passes that session data to the create hook, and later looks up a session by the supplied token. The session route passes the cookie token to that lookup. This observation concerns the cached version and its default flow; it does not prove whether a supported custom integration can meet the hash-only requirement. No database or executable test was used for this inspection. Pin the actual version and prove the chosen integration with independent persistence and revocation checks before accepting it.

On 12 November 2026, `bun --version` in Natthawat's local environment returned `1.4.4`. A read-only query of [Docker Hub tag metadata](https://hub.docker.com/v2/repositories/oven/bun/tags/1.4.4) reported the `oven/bun:1.4.4` tag active for `linux/amd64` and `linux/arm64`. This confirms tag availability at that time, not image compatibility or team approval; no image was pulled or built.

## Concrete session proposal for team review

The following values are a proposal, not an agreed decision. Review them together before promoting them into D-05, D-07, the System SDS and the Sprint 1 contract.

- **Expiry:** propose a configurable absolute session lifetime with a default of 24 hours from sign-in, no separate idle timeout, and session refresh disabled. Expired sessions cannot access protected resources. A new sign-in creates a new session. These settings remain subject to both students' agreement.
- **Storage:** retain D-05's hash-only requirement. Confirm that the selected Better Auth version can satisfy it through a supported adapter or integration before accepting this design. If it cannot, bring an explicit alternative back for team decision; do not silently store the bearer token in plaintext.
- **Cookies and request protection:** use an HttpOnly, SameSite=Lax session cookie, with Secure enabled under HTTPS. Permit credentialed requests only from configured application origins. Reject unsafe requests with a missing or unapproved Origin; agree the handling of non-browser clients before supporting them. Do not enable a session cache that bypasses the enabled-user check.
- **Disabled accounts:** reject sign-in with the same public response as invalid credentials. Recheck the current enabled state for every protected request and reject disabled users' existing sessions on the next request. Logout revokes the current session.
- **Seed:** provision explicitly configured synthetic users through a documented idempotent setup path. Rerunning it must not reset an existing user's password, enabled state or financial data. Public self-registration remains disabled.

### Proposed public session interface

| Request | Proposed success | Proposed rejection |
| --- | --- | --- |
| `POST /api/session` with `email` and `password` | `200` with `{ "id", "displayName", "role" }` and a session cookie | `401` with `INVALID_CREDENTIALS` for an invalid or disabled identity; `400` with `INVALID_INPUT` for malformed input |
| `GET /api/session` | `200` with the same identity fields | `401` with `UNAUTHENTICATED` for missing, expired, revoked or disabled sessions |
| `DELETE /api/session` | `204`, revoke the current session and clear its cookie | `204` and clear the cookie even if the session is already absent or expired |

Error responses use `{ "code": "...", "message": "..." }` without account-existence or financial details. Role is derived server-side. No API response includes a password or session token. Confirm transport and error precedence for disallowed origins as part of D-07.

### Proposed verification examples

Using two distinct synthetic users and an administrator in an authorized disposable database: valid credentials return the matching identity; an incorrect password and a disabled identity both return `401 INVALID_CREDENTIALS`; a session fails with `401 UNAUTHENTICATED` after revocation, expiry or disabling its user; repeated logout returns `204`; and a direct signup request creates no user. Repeat reads after application restart to establish persistence. Testing that an administrator cannot read another user's financial resources is deferred until those endpoints exist in a later financial slice. Choose and agree the precise test interfaces and expected origin-rejection response before writing executable tests; record actual results and tested commit separately.

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
