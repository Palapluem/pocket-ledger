# Authentication and setup decision

Draft 0.8, 15 November 2026 · Issue #2 · **Stateless JWT, 3600-second lifetime, HS256/`jose` and key source/rotation/retention agreed; Origin/CSRF request protection deferred until deployment review.** The choices were accepted by both students and integrated through PR #15 (`98afb3b`). This records the team's selected Sprint 1 authentication scope and the implementation details verified in merged PRs #12 and #14.

## Scope

The team selected Better T Stack. Although Better Auth was included in the initial D-02 selection, the team now chooses a small first-party JWT flow for Sprint 1 seeded-user sign-in. The team accepts the logout and account-change limitations listed below; the 3600-second token lifetime and HS256 with `jose` are approved. Wisit accepted a minimum-32-byte random `JWT_SECRET` held in an ignored local `.env` or deployment secret store, manual replacement/restart rotation that invalidates all outstanding tokens, and no previous-key retention. Origin/CSRF policy is deferred until deployment review; the current Origin check is optional hardening. Public self-registration, email delivery, password recovery and financial workflows are outside this slice.

## Selected Sprint 1 approach: first-party signed JWT

After validating a seeded user's credentials and enabled status, the server issues a signed JWT and sets it as an HttpOnly cookie. The JWT is a signed token (JWS), not an encrypted token. Its claims can be read by the holder, so include only the agreed `sub`, `displayName`, `role`, `iss`, `aud`, `iat` and `exp` claims. The issuer is `pocket-ledger` and the audience is `pocket-ledger-web`. Do not place passwords, secrets or financial data in the token.

This design has no server-side session table, refresh token or revocation list. Protected requests verify the signature and required claims locally; they do not reload the user's current role or enabled state. The token's role and account state therefore remain the values from sign-in until that token expires.

### Accepted behavior and limits

- **Logout:** clear the cookie in the current browser and return success. A copied token cannot be revoked by that action and remains usable until its expiry while its signing key is accepted. Retiring the signing key can invalidate outstanding tokens earlier; this effect is accepted under the manual rotation policy.
- **Role or account changes:** a role change or account disable does not invalidate an already-issued token while its signing key remains accepted. A new sign-in uses the current user record; a disabled user cannot receive a new token.
- **Expiry:** the JWT expiry is the session limit. The approved duration is 3600 seconds. No refresh token or idle-timeout mechanism is included in this small slice.
- **Recovery:** if account-disable or role changes must take effect immediately, load the current user state on each protected request (at the cost of a database read). If logout must revoke copied tokens immediately, replace this stateless design with a server-side session or revocation mechanism and update D-05 first.

This is the team's product-design choice, not a course requirement. PD1 and Lab 5 do not prescribe Better Auth, JWT or a token-storage method. The team should check with the instructor only if given a separate stack instruction. Follow the [OWASP JWT guidance](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html); signed JWT claims are readable, not encrypted ([RFC 7519](https://www.rfc-editor.org/rfc/rfc7519.html)).

### Password and token handling

- Store passwords using an adaptive one-way password-hashing function from a trusted library, with parameters chosen before implementation. Never encrypt passwords for later decryption; follow the [OWASP Password Storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- Use a maintained JWT library. Pin the accepted signing algorithm; reject tokens with an unexpected algorithm, invalid signature, issuer, audience, not-before time or expiry.
- Keep the random signing key in an ignored local `.env` or deployment secret store, never in Git or the client. Rotate manually by replacement and restart; the single-key policy invalidates every outstanding JWT and retains no previous key.
- Use an HttpOnly, SameSite=Lax cookie and enable Secure under HTTPS. SameSite is one CSRF defense, not the only one. Origin/CSRF policy is deferred until deployment review; the existing configured-Origin guard is optional hardening and does not constitute an agreed request-protection policy.
- Do not log or publish bearer tokens. JWT signature validation protects integrity, not confidentiality.

## Decisions recorded for F-01

| Decision | Review point |
| --- | --- |
| Authentication library | First-party signed JWT is selected for Sprint 1 seeded-user authentication; do not use Better Auth for this slice. |
| Token lifetime | Approved: 3600 seconds. The team accepts the resulting logout and account-change window (PR #9). |
| Signing | Approved: HS256 with the `jose` library; issuer `pocket-ledger` and audience `pocket-ledger-web` are implemented. The agreed key policy stores a random `JWT_SECRET` of at least 32 bytes outside Git and rotates by replacement/restart with no previous-key retention. |
| Cookie and request protection | Use HttpOnly and SameSite=Lax; enable Secure under HTTPS. Current implementation rejects unsafe requests with a missing or mismatched configured Origin. This is optional hardening, not the agreed policy; the team deferred a formal Origin/CSRF decision until deployment review. |
| Public interface | The baseline POST, GET and DELETE /api/session responses and error outcomes are agreed in D-07; feature-specific refinements are reviewed in their own PRs. |
| Account changes | Confirm that disabled users and changed roles affect existing tokens only after expiry; do not promise immediate revocation. |
| Ownership and review | F-01 and F-02 backend changes are merged in PRs #12 and #14 with teammate review; financial feature ownership follows the D-01/D-06 split in `docs/decisions.md`. |

## Sprint 1 baseline interface (agreed)

| Request | Baseline success | Baseline rejection or limitation |
| --- | --- | --- |
| POST /api/session with email and password | 200 with identity fields and a signed JWT cookie | 401 INVALID_CREDENTIALS for invalid or disabled users; 400 INVALID_INPUT for malformed input |
| GET /api/session | 200 with identity claims from the verified token | 401 UNAUTHENTICATED for missing, invalid or expired tokens; returned role is the sign-in snapshot |
| DELETE /api/session | 204 and clear the current browser cookie | Does not revoke another copy of the token; that copy remains valid until expiry |

Error responses use a stable code and safe message without account-existence or financial details. The response body never contains the JWT or password. Public signup is not exposed, and a direct signup request must be rejected server-side. These baseline outcomes are agreed in D-07; a feature PR must review any change before updating tests or implementation.

## Verification plan

The 3600-second lifetime and HS256 with `jose` are approved and implemented. The baseline status codes and interface are agreed in D-07; feature-specific refinements must be reviewed before tests or implementation change. Then independently verify:

1. Valid seeded credentials issue a token with the expected subject and role; invalid credentials and a disabled identity do not issue one.
2. Missing, expired, tampered, wrong-algorithm, wrong-issuer and wrong-audience tokens are rejected.
3. Authorization uses the signed role claim; a role change or account disable does not change an existing token's behavior before expiry. A new sign-in uses the current user record, and a disabled user receives no new token.
4. Logout clears the browser cookie. A separate copy of that same token remains usable until expiry while its signing key is accepted; this is the accepted limitation, not a test failure.
5. Direct signup creates no user. No password, signing key or bearer token appears in responses, logs or committed evidence.

The implemented authentication/administration results are recorded in `docs/sprints/sprint-1/tests.md`. The list above is the verification intent; do not infer coverage beyond the specific test rows and runs recorded there.

## Setup notes

- Use the confirmed Better T Stack workspace and accepted Bun 1.4.4/PostgreSQL 18.4 active pins. Container base/deployment image versions are selected for Lab 5 and must be recorded consistently when those images are configured.
- Supply database and signing-key values locally through ignored environment files or deployment secrets. Commit placeholders only; never print real credentials in evidence.
- Seed only explicitly configured synthetic users. Re-running setup must not reset an existing password or change user state or financial data.
- This decision record creates no database, cloud resource, executable test or application behavior.

## Implementation details verified in the F-01/F-02 PRs

These values are used by the F-01 implementation (Issue #11). The 3600-second lifetime, HS256/`jose`, stateless-token limitations and key-management policy are accepted. The baseline implementation is recorded in the reviewed F-01/F-02 PRs; future API refinements must be reviewed in their own PRs and reflected in the contract and tests:

- JWT lifetime 3600 seconds (approved), no refresh; HS256 using the `jose` library (approved); `exp` and `sub` claims are required, so a correctly signed token without `exp` is rejected; fixed issuer `pocket-ledger` and audience `pocket-ledger-web` (configurable); the lifetime itself is not configurable, and a `JWT_TTL_SECONDS` value other than 3600 stops the server at start-up; current implementation reads a secret from `JWT_SECRET` (at least 32 bytes), with the approved source/rotation/retention policy recorded in D-05.
- Passwords hashed with argon2id through the Bun runtime (`Bun.password`).
- Cookie `session`: HttpOnly, SameSite=Lax, Path=/, Max-Age equal to the lifetime, Secure when `COOKIE_SECURE=true`.
- Request protection (optional hardening currently implemented): an unsafe request (POST/PUT/PATCH/DELETE) is accepted only when its `Origin` header equals the configured origin; a different or missing `Origin` is rejected with `403 FORBIDDEN_ORIGIN`. This behavior is proposed as the production policy in [D-05](../../decisions.md#d-05-authentication-and-deactivation) for the Lab 5 deployment review and is not yet accepted. Non-browser clients must send the configured `Origin` while this implementation is in use. Do not treat the implementation as a closed decision.
- Test safety: integration tests refuse to run unless `TEST_DATABASE_URL` is the disposable database created by `scripts/test-db.sh`: a loopback host, port 55432 (or `TEST_DB_PORT`) and database `pocket_ledger_test`.
- CI: `.github/workflows/ci.yml` runs type check, Biome and the integration tests against a PostgreSQL 18.4 service container on pull requests and pushes to `main` and `sprint-1-staging`. Required-check names are configured only after the jobs have run on GitHub.
- Agreed baseline interface: `POST/GET/DELETE /api/session`; no signup route.
- Administration (F-02, Issue #13): `GET /api/admin/users` and `PATCH /api/admin/users/:id` with `{ "enabled": boolean }`, Administrator role claim required (`401 UNAUTHENTICATED`, `403 FORBIDDEN`). Approved safeguard: the last enabled administrator cannot be disabled. The server checks current database state inside one transaction (enabled administrator rows locked in id order), not the token's role snapshot, and rejects with `409 LAST_ADMIN_FORBIDDEN`. An administrator may disable their own account while another enabled administrator remains. CORS allows `GET, POST, PATCH, DELETE, OPTIONS` from the configured origin with credentials, verified by a preflight test. AC-08 is deferred until financial endpoints exist.

Evidence for these choices comes only from the automated tests in the PR, not from this document.

## Implementation gate

F-01 authentication is implemented and merged into `sprint-1-staging` (PR #12, merge `ed9bf57`). For future authentication changes, revisit the deferred Origin/CSRF policy before public deployment, record any change to the agreed D-05 key policy or D-07 public interface first, and keep the System SDS, Sprint 1 contract and STS consistent. Implement each change on a bounded branch from current staging and request the other teammate's review. Keep generated Better Auth routes and dependencies out of the Sprint 1 authentication path.
