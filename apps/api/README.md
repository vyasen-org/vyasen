# Indic SMS API

The Indic SMS API is a Fastify application providing the backend services
currently implemented for the project. Its active feature is authentication:
email one-time-code sign-in, Google OAuth/OIDC, Google One Tap, Google identity
linking, and cookie-backed sessions.

The API is written in TypeScript, uses Zod schemas from
[`@vyasen/contracts`](../../packages/contracts), and stores authentication
data in PostgreSQL through Kysely and
[`@vyasen/database`](../../packages/database).

> **Current scope:** user accounts are global identities. Authentication does
> not create a school, assign an `institution_id`, or grant school membership or a
> role. Those permissions must come from a future authorized onboarding or
> invitation flow. School-specific API endpoints are not implemented yet.

## Architecture

The API follows the repository’s feature-first, layered dependency direction:

```text
HTTP request
    |
Route (Fastify plugin, URL and Zod request/response schemas)
    |
Controller (HTTP input, status, cookies, redirect)
    |
Service (use cases, validation policy, rate limits, transactions)
    |
Repository (Kysely queries)
    |
PostgreSQL

Service ----> Provider/adapter (SMTP and Google OAuth/OIDC)
Route ------> Shared contracts (@vyasen/contracts)
```

The current authentication module is in [`src/modules/auth`](src/modules/auth):

| File | Responsibility |
| --- | --- |
| `auth.routes.ts` | Registers authentication endpoints, schemas, and authentication pre-handlers. |
| `auth.controller.ts` | Maps Fastify requests to service calls and handles responses, cookies, and redirects. |
| `auth.service.ts` | Implements sign-in, identity, rate-limit, and session use cases. |
| `auth.repository.ts` | Reads and writes authentication records using Kysely. |
| `auth.provider.ts` | Integrates with SMTP and Google OAuth/OIDC and handles token/hash utilities. |
| `auth.guard.ts` | Resolves and requires the authenticated session. |
| `auth.security.ts` | Requires an allowed `Origin` on state-changing requests. |

[`src/app.ts`](src/app.ts) creates the Fastify application, database and
providers, configures request validation and serialization, security headers,
CORS, error handling, logging, and route registration. Configuration is
validated when [`src/config.ts`](src/config.ts) loads. The server entry point
[`src/server.ts`](src/server.ts) starts listening, schedules hourly cleanup of
expired authentication data, and closes the application on shutdown signals.

Request and response contracts are shared with the web app in
`packages/contracts`. Database connections, types, and migrations are owned by
`packages/database`.

## Local setup

### Prerequisites

- Node.js compatible with the repository’s toolchain.
- pnpm (the root package declares `pnpm@12.15.0`).
- PostgreSQL.
- SMTP credentials to deliver email sign-in codes.
- Optional: Google OAuth web-client credentials for Google sign-in and One Tap.

### Configure and start

Run commands from the repository root:

1. Install workspace dependencies:

   ```bash
   pnpm install
   ```

2. Copy the root environment template to `.env` and set the local values:

   ```bash
   cp .env.example .env
   ```

   Generate **three different** secrets for `AUTH_CODE_HASH_SECRET`,
   `AUTH_STATE_SECRET`, and `AUTH_RATE_LIMIT_SECRET`:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

   Each secret must be at least 32 characters. Do not commit `.env` or share
   secret values.

3. Configure `DATABASE_URL` with the PostgreSQL connection string used by the
   running API. Apply database migrations:

   ```bash
   pnpm db:migrate
   ```

   In development, the migration command can use `DATABASE_URL` when
   `MIGRATION_DATABASE_URL` is absent. In production, set
   `MIGRATION_DATABASE_URL` to a separate, migration-privileged connection.

4. Configure SMTP before requesting email sign-in codes. To enable Google
   OAuth and One Tap, set both `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`; add the web origin to the Google client’s authorized
   JavaScript origins and register the API callback URI as an authorized
   redirect URI.

5. Start the API in watch mode:

   ```bash
   pnpm --filter @vyasen/api dev
   ```

By default, the API listens on `http://127.0.0.1:4000`. The web app’s default
API base URL is `http://localhost:4000`; configure `VITE_API_BASE_URL` and
`WEB_ORIGINS` consistently if you use different hosts or ports.

## Environment variables

The API loads the repository-root `.env` file. `src/config.ts` validates these
values at startup.

| Variable | Required | Default / purpose |
| --- | --- | --- |
| `NODE_ENV` | No | `development`; allowed values are `development`, `test`, `production`. |
| `API_HOST` | No | `127.0.0.1`, the bind host. |
| `API_PORT` | No | `4000`, the bind port. |
| `API_PUBLIC_ORIGIN` | No | `http://localhost:4000`; public API origin used to construct and validate the Google callback URI. |
| `WEB_ORIGINS` | No | `http://localhost:3000`; comma-separated allowed web origins for CORS and state-changing request origin checks. |
| `DATABASE_URL` | Yes | PostgreSQL connection string for the API runtime. |
| `MIGRATION_DATABASE_URL` | Production migrations | Separate database connection for migrations. In development, migrations fall back to `DATABASE_URL`. |
| `AUTH_CODE_HASH_SECRET` | Yes | Random secret for hashing email verification codes and rate-limit keys; minimum 32 characters. |
| `AUTH_STATE_SECRET` | Yes | Random secret for signed Google OAuth state; minimum 32 characters. |
| `AUTH_RATE_LIMIT_SECRET` | Yes | Random secret for keyed rate-limit hashes; minimum 32 characters. |
| `SESSION_COOKIE_NAME` | No | `school_sms_session`. |
| `SESSION_COOKIE_DOMAIN` | No | Omit to use a host-only cookie; set only when required by the deployment. |
| `SESSION_COOKIE_SAME_SITE` | No | `lax`; allowed values are `strict`, `lax`, `none`. `none` is permitted only in production and requires HTTPS. |
| `TRUST_PROXY` | No | Empty means do not trust proxies. Otherwise, comma-separated trusted proxy IPs/CIDRs; do not use a wildcard. |
| `GOOGLE_CLIENT_ID` | Optional | Set together with `GOOGLE_CLIENT_SECRET` to enable Google sign-in. |
| `GOOGLE_CLIENT_SECRET` | Optional | Set together with `GOOGLE_CLIENT_ID`. |
| `GOOGLE_REDIRECT_URI` | No | Defaults to `${API_PUBLIC_ORIGIN}/api/v1/auth/google/callback`; if set, it must use that origin and callback path. |
| `SMTP_HOST` | Optional | Configure to enable email-code delivery. |
| `SMTP_PORT` | No | `587`. |
| `SMTP_SECURE` | No | `false`; set `true` when SMTP uses an implicit TLS connection. |
| `SMTP_USER` | Optional | SMTP username; must be set together with `SMTP_PASSWORD`. |
| `SMTP_PASSWORD` | Optional | SMTP password; must be set together with `SMTP_USER`. |
| `SMTP_FROM` | No | `no-reply@vyasen.example`; accepts an email address or `Display Name <email>`. |

Google credentials must be configured as a pair. Production API and web origins
must use HTTPS. Configure `TRUST_PROXY` only with the addresses or CIDRs of
trusted proxies; the API uses the request IP for rate limits and session
metadata.

## HTTP API

All current endpoints are under `/api/v1/auth`. Request and response bodies are
validated or serialized using shared Zod contracts where declared in the route.
There is no Swagger/OpenAPI documentation endpoint registered in the current
API app.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/email/codes` | Public | Request an email sign-in code. Returns `202` with a challenge ID, expiry, and generic message. |
| `POST` | `/api/v1/auth/email/sessions` | Public | Verify a code, create/sign in the user, and set the session cookie. |
| `GET` | `/api/v1/auth/google/nonce` | Public | Obtain a short-lived nonce for Google One Tap. |
| `GET` | `/api/v1/auth/google/authorize` | Public | Begin Google OAuth; accepts optional `returnTo` query parameter. |
| `GET` | `/api/v1/auth/google/callback` | Public | Handle the Google OAuth callback and redirect to the web app. |
| `POST` | `/api/v1/auth/google/one-tap` | Public | Verify a Google One Tap credential and sign in. |
| `POST` | `/api/v1/auth/google/identities` | Authenticated | Link a verified Google identity to the signed-in user. |
| `GET` | `/api/v1/auth/session` | Authenticated | Return the current user. |
| `DELETE` | `/api/v1/auth/session` | Public | End the current session and clear its cookie. |
| `GET` | `/api/v1/auth/sessions` | Authenticated | List the current user’s active sessions. |
| `DELETE` | `/api/v1/auth/sessions/:sessionId` | Authenticated | Revoke one session belonging to the current user. |
| `DELETE` | `/api/v1/auth/sessions` | Authenticated | Revoke all sessions for the current user. |

State-changing requests must include an `Origin` matching an entry in
`WEB_ORIGINS`. CORS allows only those configured origins and credentials.
Errors use the `{ "error": { "code": "...", "message": "..." } }` response
shape. Rate-limited responses may include a `Retry-After` header.

## Authentication and session behavior

### Email one-time codes

- Codes are six digits, expire after 10 minutes, and allow at most five
  verification attempts.
- Only an HMAC-SHA-256 hash of a code is stored. A new request invalidates
  previously open codes for the same email.
- Resends are limited to one every two minutes; code requests are also limited
  by email and IP. Verification attempts are limited by email and IP.
- Code verification and account/session creation use PostgreSQL transactions.
- Email delivery happens after the code transaction commits. Delivery failures
  consume the challenge and return an explicit service-unavailable error.
- The request response does not disclose whether an account exists.

### Google sign-in

- OAuth uses a signed, short-lived, HTTP-only state cookie, a nonce, and PKCE
  S256. ID tokens are verified for signature, issuer, audience, expiry,
  verified email, and nonce.
- One Tap uses a short-lived, single-use nonce. Nonces are stored as hashes.
- Google identities are matched by provider subject. A verified Google identity
  is not automatically linked to an existing account solely because its email
  matches; explicit linking is required.
- Google OAuth, One Tap, and identity linking require Google credentials.

### Sessions

- Session tokens are random opaque values stored in an HTTP-only cookie; only
  their SHA-256 hashes are persisted.
- Sessions expire after 30 days. The API checks expiry and revocation when
  authenticating a request and records device/browser metadata.
- A user may have at most five active sessions. Creating another session
  revokes the oldest active session.
- Production session cookies are Secure. Set `SESSION_COOKIE_SAME_SITE` and
  `SESSION_COOKIE_DOMAIN` to match the deployment topology; cross-site cookies
  require `SameSite=None` and HTTPS.

## Database

The canonical schema is the migration at
[`packages/database/src/migrations/001_create_auth_tables.ts`](../../packages/database/src/migrations/001_create_auth_tables.ts).
It creates:

| Table | Purpose |
| --- | --- |
| `users` | Global user identity, normalized unique email, profile, account status, and login timestamps. |
| `auth_identities` | Unique email and Google provider identities linked to users. |
| `email_verification_codes` | Hashed, expiring, attempt-limited email sign-in challenges. |
| `sessions` | Hashed session tokens, expiry/revocation, and device metadata. |
| `auth_rate_limits` | Shared hashed rate-limit buckets across API instances. |
| `auth_nonces` | Hashed, expiring, single-use Google One Tap nonces. |

Authentication data is global rather than school-owned and therefore is not
tenant-scoped. Any future school-owned data must follow the repository’s
tenant-isolation requirements, including `institution_id`, authorization checks,
and PostgreSQL Row-Level Security where applicable.

The server runs bounded cleanup for expired codes, nonces, rate-limit buckets,
and old expired or revoked sessions once per hour. Database migrations are not
run automatically during API startup.

## Development commands

Run commands from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm --filter @vyasen/api dev` | Run the API with `tsx watch`. |
| `pnpm --filter @vyasen/api start` | Run the API without watch mode. |
| `pnpm --filter @vyasen/api build` | TypeScript validation (`tsc --noEmit`). |
| `pnpm --filter @vyasen/api typecheck` | Type-check the API. |
| `pnpm --filter @vyasen/api lint` | Run the API package’s TypeScript lint check. |
| `pnpm --filter @vyasen/api test` | Run API authentication tests with Node’s test runner. |
| `pnpm db:migrate` | Apply pending PostgreSQL migrations (`packages/database`). |

## Adding an API feature

Follow the rules in [`AGENTS.md`](AGENTS.md) and keep the dependency direction
from HTTP routes toward the database:

1. Define public request/response schemas in the owning feature or shared
   contracts package as appropriate.
2. Implement routes in a `.routes.ts` Fastify plugin. Routes declare URL,
   schemas, access guards, and the controller; they do not contain database
   queries or business workflows.
3. Keep HTTP-specific behavior in the controller, business rules and
   transaction boundaries in the service, and Kysely queries in the
   repository.
4. Keep third-party integrations behind a provider/adapter.
5. Add a migration for schema changes. Do not edit an already-applied
   production migration; add a new migration instead.
6. Register the new route plugin in [`src/app.ts`](src/app.ts), since the
   current app registers route modules explicitly.
7. Add focused service, repository, and/or route tests, then run the API
   type-check and test scripts.

Do not expose an endpoint until authentication, authorization, input
validation, and tenant boundaries are defined for that feature.
