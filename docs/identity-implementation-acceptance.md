# Identity & Authentication implementation and acceptance

## Security remediation status (18 November 2026)

The independent review of commit `35c8c34` found cross-account browser cache
disclosure, password-login/unlink races, last-usable-method lockout, a profile
response limit mismatch, broken automatic Google One Tap callback handling,
skipped database tests in the root CI command, missing contact removal, and
incomplete audit events. Follow-up implementation changes address these items;
their verification results must be read together with the current test run,
not inferred from the older results below.

**Persistent database upgrade remains blocked.** The old six-table baseline
has already been applied in some possible environments, but an inventory of
their schemas, data value, and migration history is not available. The current
hardening migration fails against the old schema because `user_contacts` does
not exist. No production or shared database was migrated or reset. Before
deploying, inventory each environment and implement a data-preserving forward
migration if any old-schema database must be retained; otherwise rebuild only
an explicitly identified disposable database. The old-schema upgrade is not
accepted by the fresh-database tests.

Review date: 2026-11-17. This report records implementation and verification
evidence, rather than claiming production readiness or live-provider delivery.

## Specification and scope

The supplied approved identity design (version 1.0) and implementation plan
govern this work. The architecture copy is
`apps/docs/docs/architecture/identity-and-authentication.md`. Institutional
memberships, RBAC, family verification, academic modules, MFA, and recovery
workflows remain deferred.

## Requirement coverage

Paths in this table are relative to the repository. API implementation files
are under `apps/api/src/modules/auth/`; web components are under
`apps/web/src/components/`.

| Requirement                                               | Specification | Status                                                                               | Backend/API evidence                                                                                                        | Frontend evidence                                                 | Automated evidence                                                                                                            |
| --------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Ten-table global identity model                           | §§2–3         | Implemented but not end-to-end verified in an existing persistent database           | `packages/database/src/database.ts`, baseline and timestamped hardening migrations                                          | Shared identity contracts                                         | Fresh isolated PostgreSQL 18 migration and ten-table assertion                                                                |
| Email/password signup, verification before password setup | §4            | Verified end-to-end with test delivery                                               | `identity.service.ts`, `identity.routes.ts`, shared password/proof contracts                                                | `auth/identity-form.tsx`                                          | Browser signup; concurrent proof consumption and replay tests                                                                 |
| Password sign-in without routine OTP                      | §§3.5, 4      | Verified end-to-end                                                                  | `identity.service.ts` Argon2id and identity lookup                                                                          | `auth/identity-form.tsx`                                          | Browser sign-in after logout; wrong password and linked-email login tests                                                     |
| Email OTP-only signup/sign-in                             | §4            | Verified end-to-end with test delivery                                               | Legacy email routes delegate to purpose-bound identity service                                                              | Existing modal and identity form                                  | Browser OTP signup; single-use verification and session cap integration test                                                  |
| Phone OTP signup/sign-in                                  | §§3.6, 4      | Verified end-to-end with fake SMS delivery                                           | SMS provider, identity challenge service                                                                                    | Smart identifier and OTP form                                     | Browser phone signup; API fake-provider replay tests                                                                          |
| SMS unavailable                                           | §4            | Verified end-to-end                                                                  | Issue and verify enforce provider availability                                                                              | Explicit unavailable message and alternatives                     | API rejection tests and browser unavailable-state test                                                                        |
| Google OAuth and One Tap                                  | §4            | Implemented but not end-to-end verified with Google                                  | Provider signature/audience/issuer/expiry checks, state/PKCE/nonce; OAuth nonce consumption added                           | Existing Google popup and One Tap                                 | PKCE/state tests; controlled One Tap, replay, collision, profile creation, explicit Google linking integration                |
| Profile creation and editing                              | §3.2          | Verified end-to-end                                                                  | Transactional profile creation, own-account profile endpoint                                                                | `settings/identity-settings.tsx` within existing profile settings | Fresh-account profile assertion, API authorization and save; browser save/reload                                              |
| Verified contacts and primary selection                   | §3.3          | Verified end-to-end with test delivery                                               | Contact-purpose challenge, user lock, cross-user sharing rejection, partial primary unique index                            | Contact form and primary controls                                 | Contact/identity separation, cross-account rejection, primary concurrency; browser contact verification and primary selection |
| Explicit method linking                                   | §4            | Verified end-to-end for email; Google implemented but browser integration unverified | Purpose-bound linking, unique ownership; Google credential linking endpoint                                                 | Email/phone linking form and Google linking control               | Email browser flow; purpose-isolation, Google collision, and linking integration tests                                        |
| Last-method unlink protection                             | §4            | Implemented but not end-to-end verified for all provider combinations                | User-lock serialization and last-identity check                                                                             | Disabled final-method removal and confirmation                    | Backend last-method denial; linked-email removal; browser final-method disabled control                                       |
| Sessions, logout, revocation                              | §3.7          | Verified end-to-end                                                                  | Hashed opaque tokens, active-account checks, expiry, revoke/list; transactional five-session limit                          | Existing logout plus signed-in-device list and revoke controls    | API login/logout/CSRF; browser revoke-all and subsequent password sign-in                                                     |
| Security controls                                         | §5            | Implemented but not every control end-to-end verified                                | HMAC challenges and destination hashes, rate limits, single-use proof, Argon2id, audit events, sanitized errors and cookies | No secret storage, server-authoritative state, cache clearing     | Purpose mismatch, replay, expiry, cooldown, cross-account denial, wrong password, origin and session tests                    |

## Routes and contracts

Existing email, Google, and session endpoints remain available. New endpoints
under `/api/v1/auth`:

- `GET /availability`
- `POST /challenges`
- `POST /challenges/verify`
- `POST /password/signup`
- `POST /password/sessions`
- `GET /account`
- `POST /profile`
- `POST /contacts/:id/primary`
- `DELETE /identities/:id`

Routes delegate to controllers, services, repositories, and provider boundaries.
Shared schemas live in `packages/contracts/src/identity.ts` and `auth.ts`.
Frontend services validate responses against those schemas.

Signup OTP verification consumes the OTP and creates a separate five-minute
password-setup challenge whose secret is a SHA-256 hash of a random 256-bit
proof. Password submission consumes that proof in the same transaction as
account/profile/identity/contact/credential/session creation. The proof remains
only in frontend component state. No transaction spans user interaction.

Argon2id uses the native asynchronous Node.js implementation with 64 MiB,
three passes, one lane, a random 16-byte salt, and a 32-byte result. The minimum
Node version is now 24.7. Password checks for unknown credentials still perform
the derivation to reduce enumeration differences.

## Verification and reproduction

Executed against a dedicated PostgreSQL 18 cluster at local port 55439,
initialized for this task with user `identity_test` and trust authentication.
The configured application database was not migrated or reset.

Backend integration testing creates a randomly named disposable database, runs
all migrations, then drops only that database. Browser testing uses another
random database and a local-only test server with fake email/SMS delivery.
Test-only code retrieval and SMS controls exist solely in
`apps/api/test/identity-server.ts`, which production startup never imports.

Commands used:

```powershell
$env:DATABASE_URL='postgresql://identity_test@127.0.0.1:55439/postgres'
$env:AUTH_TEST_DATABASE_URL='postgresql://identity_test@127.0.0.1:55439/vyasen_auth_test'
$env:RUN_IDENTITY_DATABASE_TESTS='1'
pnpm --filter @vyasen/api test
pnpm --filter @vyasen/web test:browser
pnpm --filter @vyasen/api typecheck
pnpm --filter @vyasen/web typecheck
pnpm --filter @vyasen/database typecheck
pnpm --filter @vyasen/contracts typecheck
pnpm --filter @vyasen/web build
```

Backend suite: eight tests passed with database tests enabled and no skips.
Browser suite covers four real UI/API journeys with controlled delivery.
Affected-package typechecks and the web production build passed.
ESLint and Prettier were run on changed implementation files. Build warnings
include Zod comment annotations and a bundle over 500 kB; no performance
improvement is claimed.

CI now provisions its own PostgreSQL 18 service, enables database tests, and
runs browser journeys. Remote GitHub Actions execution is not verified here.

## Configuration and deployment limits

- SMTP credentials are required for live email OTP delivery.
- SMS uses `SMS_ACCOUNT_SID`, `SMS_AUTH_TOKEN`, and `SMS_FROM` together.
  Incomplete configuration is rejected; absent configuration disables SMS on
  the server. No production bypass codes exist.
- Google requires its client ID, client secret, allowed origins, and callback
  configuration. Live Google authentication, real SMS delivery, and real SMTP
  delivery were not exercised by these controlled tests.
- The baseline migration had already been modified in the incoming working
  tree. This work retains that ten-table baseline and fixes its explicit
  PostgreSQL `inet` cast. It adds timestamped hardening migration
  `20261117000000_harden_identity_constraints.ts`.
- **Persistent-database upgrade remains blocked pending inventory:** an
  environment that previously applied the old six-table baseline requires a
  separately reviewed forward data migration. Re-running the changed baseline
  against such an environment is unsafe and is not authorized by these tests.
  No applied migration bookkeeping was rewritten.
- Security-event retention, privacy/deletion policy, phone reassignment, and
  asynchronous account recovery remain deferred in the approved specification.

Existing themes, tokens, shared controls, modal shell, and settings layout are
reused. Browser checks verify functional behavior, not pixel-perfect visual
parity or a complete WCAG audit. The Docusaurus application and unrelated
business features were not changed.

Related source, tests, CI, dependency, instruction, and ignore changes are
staged for review without a commit.

## Changed files

- `.github/workflows/ci.yml`
- `.gitignore`
- `AGENTS.md`
- `README.md`
- `apps/api/AGENTS.md`
- `apps/api/src/app.ts`
- `apps/api/src/config.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/auth.provider.ts`
- `apps/api/src/modules/auth/auth.repository.ts`
- `apps/api/src/modules/auth/auth.routes.test.ts`
- `apps/api/src/modules/auth/auth.service.test.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/identity.controller.ts`
- `apps/api/src/modules/auth/identity.repository.ts`
- `apps/api/src/modules/auth/identity.routes.ts`
- `apps/api/src/modules/auth/identity.service.test.ts`
- `apps/api/src/modules/auth/identity.service.ts`
- `apps/api/test/identity-server.ts`
- `apps/web/AGENTS.md`
- `apps/web/package.json`
- `apps/web/playwright.config.ts`
- `apps/web/src/components/auth/auth-modal.tsx`
- `apps/web/src/components/auth/identity-form.tsx`
- `apps/web/src/components/settings/account-settings.tsx`
- `apps/web/src/components/settings/google-link.tsx`
- `apps/web/src/components/settings/identity-settings.tsx`
- `apps/web/src/components/settings/profile-settings.tsx`
- `apps/web/src/components/settings/session-settings.tsx`
- `apps/web/src/services/auth/auth.mutations.ts`
- `apps/web/src/services/auth/identity.service.ts`
- `apps/web/tests/identity.spec.ts`
- `docs/identity-implementation-acceptance.md`
- `package.json`
- `packages/contracts/src/auth.ts`
- `packages/contracts/src/identity.ts`
- `packages/contracts/src/index.ts`
- `packages/database/src/database.ts`
- `packages/database/src/migrations/001_create_auth_tables.ts`
- `packages/database/src/migrations/20261117000000_harden_identity_constraints.ts`
- `pnpm-lock.yaml`
