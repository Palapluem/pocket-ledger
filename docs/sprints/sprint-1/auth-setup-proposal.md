# Authentication and setup proposal

Draft 0.5, 13 November 2026 · Issue #2 · **JWT approach, 3600-second lifetime and HS256 with `jose` approved; key rotation and request-protection details remain open.** This records the team's selected Sprint 1 authentication scope. It does not implement authentication or replace the remaining Sprint 1 contract.

## Scope

The team selected Better T Stack. Although Better Auth was included in the initial D-02 selection, the team now chooses a small first-party JWT flow for Sprint 1 seeded-user sign-in. The team accepts the logout and account-change limitations listed below; the 3600-second token lifetime and HS256 with `jose` are approved, while key rotation/retention remains open; the Origin check is optional hardening. Public self-registration, email delivery, password recovery and financial workflows are outside this slice.

## Selected Sprint 1 approach: first-party signed JWT

After validating a seeded user's credentials and enabled status, the server issues a signed JWT and sets it as an HttpOnly cookie. The JWT is a signed token (JWS), not an encrypted token. Its claims can be read by the holder, so include only sub, displayName, role, iss, aud, iat and exp. Confirm exact claim names/types and issuer/audience values in D-07. Do not place passwords, secrets or financial data in the token.

This design has no server-side session table, refresh token or revocation list. Protected requests verify the signature and required claims locally; they do not reload the user's current role or enabled state. The token's role and account state therefore remain the values from sign-in until that token expires.

### Accepted behavior and limits

- **Logout:** clear the cookie in the current browser and return success. A copied token cannot be revoked by that action and remains usable until its expiry while its signing key is accepted. Retiring the signing key can invalidate outstanding tokens earlier; define key-retention/rotation behavior before implementation.
- **Role or account changes:** a role change or account disable does not invalidate an already-issued token while its signing key remains accepted. A new sign-in uses the current user record; a disabled user cannot receive a new token.
- **Expiry:** the JWT expiry is the session limit. The duration must be agreed before implementation. No refresh token or idle-timeout mechanism is included in this small slice.
- **Recovery:** if account-disable or role changes must take effect immediately, load the current user state on each protected request (at the cost of a database read). If logout must revoke copied tokens immediately, replace this stateless design with a server-side session or revocation mechanism and update D-05 first.

This is the team's product-design choice, not a course requirement. PD1 and Lab 5 do not prescribe Better Auth, JWT or a token-storage method. The team should check with the instructor only if given a separate stack instruction. Follow the [OWASP JWT guidance](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html); signed JWT claims are readable, not encrypted ([RFC 7519](https://www.rfc-editor.org/rfc/rfc7519.html)).

### Password and token handling

- Store passwords using an adaptive one-way password-hashing function from a trusted library, with parameters chosen before implementation. Never encrypt passwords for later decryption; follow the [OWASP Password Storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- Use a maintained JWT library. Pin the accepted signing algorithm; reject tokens with an unexpected algorithm, invalid signature, issuer, audience, not-before time or expiry.
- Keep the signing key in local/deployment secrets, never in Git or the client. Define key rotation and verification-key retention; retiring a key before all JWTs it signed expire invalidates those tokens early.
- Use an HttpOnly, SameSite=Lax cookie and enable Secure under HTTPS. SameSite is one CSRF defense, not the only one. Because cookies are sent automatically, restrict credentialed requests to configured origins and protect unsafe requests against CSRF.
- Do not log or publish bearer tokens. JWT signature validation protects integrity, not confidentiality.

## Decisions to record before implementation

| Decision | Review point |
| --- | --- |
| Authentication library | First-party signed JWT is selected for Sprint 1 seeded-user authentication; do not use Better Auth for this slice. |
| Token lifetime | Approved: 3600 seconds. The team accepts the resulting logout and account-change window (PR #9). |
| Signing | Approved: HS256 with the `jose` library; issuer `pocket-ledger` and audience `pocket-ledger-web` are implemented. Key source is the `JWT_SECRET` environment variable; the rotation/retention approach remains open. |
| Cookie and request protection | Use HttpOnly and SameSite=Lax; enable Secure under HTTPS. Implemented as optional hardening: allowed origin from configuration, fail-closed Origin check on unsafe requests. Not a course requirement or merge gate. |
| Public interface | Confirm the proposed POST, GET and DELETE /api/session responses and error precedence in D-07. |
| Account changes | Confirm that disabled users and changed roles affect existing tokens only after expiry; do not promise immediate revocation. |
| Ownership and review | Assign implementer and teammate reviewer, and agree independent verification before writing dependent tests or application behavior. |

## Proposed interface

| Request | Proposed success | Proposed rejection or limitation |
| --- | --- | --- |
| POST /api/session with email and password | 200 with identity fields and a signed JWT cookie | 401 INVALID_CREDENTIALS for invalid or disabled users; 400 INVALID_INPUT for malformed input |
| GET /api/session | 200 with identity claims from the verified token | 401 UNAUTHENTICATED for missing, invalid or expired tokens; returned role is the sign-in snapshot |
| DELETE /api/session | 204 and clear the current browser cookie | Does not revoke another copy of the token; that copy remains valid until expiry |

Error responses use a stable code and safe message without account-existence or financial details. The response body never contains the JWT or password. Public signup is not exposed, and a direct signup request must be rejected server-side.

## Verification plan

Before implementation, agree exact status codes, token lifetime, cookie settings and test interfaces. Then independently verify:

1. Valid seeded credentials issue a token with the expected subject and role; invalid credentials and a disabled identity do not issue one.
2. Missing, expired, tampered, wrong-algorithm, wrong-issuer and wrong-audience tokens are rejected.
3. Authorization uses the signed role claim; a role change or account disable does not change an existing token's behavior before expiry. A new sign-in uses the current user record, and a disabled user receives no new token.
4. Logout clears the browser cookie. A separate copy of that same token remains usable until expiry while its signing key is accepted; this is the accepted limitation, not a test failure.
5. Direct signup creates no user. No password, signing key or bearer token appears in responses, logs or committed evidence.

These are planned checks, not test results. Do not claim they have been implemented or run.

## Setup notes

- Use the confirmed Better T Stack workspace. Exact Bun/runtime and container image versions remain open until recorded in D-02.
- Supply database and signing-key values locally through ignored environment files or deployment secrets. Commit placeholders only; never print real credentials in evidence.
- Seed only explicitly configured synthetic users. Re-running setup must not reset an existing password or change user state or financial data.
- No database, cloud resource, executable test or application behavior is created by this documentation proposal.

## Implementation choices proposed with the F-01 PR

These values are used by the F-01 implementation (Issue #11). The 3600-second lifetime and HS256 with `jose` are approved by Wisit; the remaining items stay proposals until both teammates record them in D-05 and D-07:

- JWT lifetime 3600 seconds (approved), no refresh; HS256 using the `jose` library (approved); `exp` and `sub` claims are required, so a correctly signed token without `exp` is rejected; fixed issuer `pocket-ledger` and audience `pocket-ledger-web` (configurable); the lifetime itself is not configurable, and a `JWT_TTL_SECONDS` value other than 3600 stops the server at start-up; secret from the `JWT_SECRET` environment variable (at least 32 bytes).
- Passwords hashed with argon2id through the Bun runtime (`Bun.password`).
- Cookie `session`: HttpOnly, SameSite=Lax, Path=/, Max-Age equal to the lifetime, Secure when `COOKIE_SECURE=true`.
- Request protection (optional hardening): an unsafe request (POST/PUT/PATCH/DELETE) is accepted only when its `Origin` header equals the configured origin; a different or missing `Origin` is rejected with `403 FORBIDDEN_ORIGIN`. This is not a course requirement and not a merge gate; the fail-closed behavior stays as implemented. Non-browser clients must send the configured `Origin`. Do not relax it without recording the decision.
- Test safety: integration tests refuse to run unless `TEST_DATABASE_URL` is the disposable database created by `scripts/test-db.sh`: a loopback host, port 55432 (or `TEST_DB_PORT`) and database `pocket_ledger_test`.
- CI: `.github/workflows/ci.yml` runs type check, Biome and the integration tests against a PostgreSQL 18 service container on pull requests and pushes to `main` and `sprint-1-staging`. Required-check names are configured only after the jobs have run on GitHub.
- Interface as proposed above: `POST/GET/DELETE /api/session`; no signup route.

Evidence for these choices comes only from the automated tests in the PR, not from this document.

## Implementation gate

Before implementation, agree the remaining D-05 token-lifetime/signing values and review the public interface in D-07; keep the System SDS, Sprint 1 contract and STS consistent with this decision. Then implement on a bounded branch from current staging and request the other teammate's review. Keep generated Better Auth routes and dependencies out of the Sprint 1 authentication path; inspect the actual scaffold before removing unused generated pieces.
